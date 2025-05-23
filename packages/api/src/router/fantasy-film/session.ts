import { z } from "zod";

import type { FilmBid } from "@repo/db";

import { BID_STATUSES, FILM_ACQUISITION_TYPES, SESSION_ACTIVITY_TYPES } from "../../enums";
import type { TRPCContext } from "../../trpc";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { dropStudioFilmById } from "./film";
import { createManyStudios } from "./studio";
import type { LeagueSessionSettings, logActivityObj } from "./zod";
import { createLeagueSessionInputObj, updateLeagueSessionInputObj } from "./zod";

const getById = protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
  return await getSessionById(ctx, input.id);
});

const create = protectedProcedure.input(createLeagueSessionInputObj).mutation(async ({ ctx, input }) => {
  if (!input.leagueId) throw "No League ID provided";

  const data = {
    leagueId: input.leagueId,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    settings: JSON.stringify(input.settings),
  };

  const session = await ctx.prisma.leagueSession.create({ data });

  if (input.memberIds?.length) {
    const studios = input.memberIds.map((e) => ({
      sessionId: session.id,
      ownerId: e,
    }));
    await createManyStudios(ctx, studios);
  }

  return session;
});

const update = protectedProcedure.input(updateLeagueSessionInputObj).mutation(async ({ ctx, input }) => {
  const data = {
    leagueId: input.leagueId,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    settings: JSON.stringify(input.settings),
  };

  const session = await ctx.prisma.leagueSession.update({
    data,
    where: { id: input.id },
  });
  return session;
});

const del = protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
  return await deleteSessionById(ctx, input.id);
});

const getAcquiredFilms = protectedProcedure
  .input(z.object({ sessionId: z.string(), includeDetails: z.boolean().optional() }))
  .query(async ({ ctx, input }) => {
    const list = await ctx.prisma.studioFilm.findMany({
      include: { tmdb: true },
      where: { studio: { sessionId: { equals: input.sessionId } } },
    });
    if (!input.includeDetails) return list;

    return list;
  });

const getStandings = protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
  return ctx.prisma.leagueSessionStudio.findMany({
    where: { sessionId: input.sessionId },
    orderBy: { score: "desc" },
  });
});

const getBids = protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
  return await ctx.prisma.filmBid.findMany({
    include: { tmdb: true, studio: { select: { name: true, ownerId: true } } },
    where: {
      studio: { sessionId: input.sessionId },
      status: BID_STATUSES.PENDING,
    },
    orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
  });
});

const getLogs = protectedProcedure
  .input(z.object({ sessionId: z.string(), page: z.number(), studioId: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const where = { sessionId: input.sessionId, studioId: input.studioId };
    const total = await ctx.prisma.leagueSessionActivity.count({ where });
    const data = await ctx.prisma.leagueSessionActivity.findMany({
      include: {
        session: { select: { leagueId: true } },
        studio: { select: { name: true, ownerId: true } },
        film: true,
      },
      where,
      skip: (input.page - 1) * 10,
      take: 10,
      orderBy: { timestamp: "desc" },
    });

    return {
      data,
      total,
    };
  });

export const leagueSessionRouter = createTRPCRouter({
  getById,
  create,
  update,
  delete: del,
  getAcquiredFilms,
  getStandings,
  getBids,
  getLogs,
});

////////////////

export async function getSessionById(ctx: TRPCContext, id: string) {
  const session = await ctx.prisma.leagueSession.findFirst({
    include: {
      studios: { include: { films: true }, orderBy: { score: "desc" } },
      league: { select: { ownerId: true } },
    },
    where: { id },
  });
  if (!session) return null;
  return {
    ...session,
    settings: JSON.parse(session.settings as string) as LeagueSessionSettings,
  };
}

export async function logSessionActivity(ctx: TRPCContext, input: z.infer<typeof logActivityObj>) {
  const data = { ...input, timestamp: new Date() };
  return await ctx.prisma.leagueSessionActivity.create({ data });
}

export async function processSessionBids(ctx: TRPCContext, sessionId: string, timestamp: Date) {
  const bids = await ctx.prisma.filmBid.findMany({
    include: { tmdb: true },
    where: {
      studio: { sessionId },
      status: BID_STATUSES.PENDING,
      createdAt: { lte: timestamp },
    },
    orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
  });

  const tmdbIds = new Set(bids.map((e) => e.tmdbId));

  const byTMDBId: Record<number, typeof bids> = {};
  bids.forEach((e) => {
    if (!byTMDBId[e.tmdbId]) byTMDBId[e.tmdbId] = [];
    byTMDBId[e.tmdbId]?.push(e);
  });

  const completed: number[] = [];
  const winners: Record<string, number[]> = {};

  for (let i = 0; i < tmdbIds.size; i++) {
    const { filmId, bidsForFilm, ignored } = getFilmBids(bids, winners, completed);
    if (ignored?.length)
      await ctx.prisma.filmBid.deleteMany({
        where: { id: { in: ignored?.map((e) => e.id) } },
      });
    if (!bidsForFilm?.length) continue;

    const { winner, losers } = await getWinnerAndLosers(ctx, bidsForFilm);
    if (!winner) continue;
    if (!winners[winner.studioId!]) winners[winner.studioId!] = [];
    winners[winner.studioId!]?.push(winner.slot!);

    await ctx.prisma.filmBid.update({
      data: { status: BID_STATUSES.WON },
      where: { id: winner.id },
    });
    await ctx.prisma.leagueSessionStudio.update({
      data: { budget: winner.studio!.budget - (winner.amount ?? 0) },
      where: { id: winner.studioId },
    });

    const toDrop = await ctx.prisma.studioFilm.findFirst({
      include: { tmdb: true },
      where: { studioId: winner.studioId, slot: winner.slot },
    });
    if (toDrop) await dropStudioFilmById(ctx, toDrop.id, { doNotLog: true });

    const film = await ctx.prisma.studioFilm.create({
      data: {
        tmdbId: winner.tmdbId!,
        studioId: winner.studioId!,
        slot: winner.slot!,
        acquiredAt: new Date(),
        acquiredType: FILM_ACQUISITION_TYPES.WON_BID,
      },
    });

    const session = await getSessionById(ctx, winner.studio!.sessionId);
    const slot = session?.settings.teamStructure[winner.slot! - 1];
    await logSessionActivity(ctx, {
      sessionId,
      studioId: winner.studioId,
      tmdbId: film.tmdbId,
      type: SESSION_ACTIVITY_TYPES.BID_WON,
      message: `{STUDIO} ADDED {FILM} in their ${slot?.type} slot for $${winner.amount}${
        toDrop ? ` (DROPPED ${toDrop.tmdb.title})` : ""
      }`,
    });

    if (losers?.length)
      await ctx.prisma.filmBid.updateMany({
        data: { status: BID_STATUSES.LOST },
        where: { id: { in: losers?.map((e) => e.id) } },
      });

    completed.push(filmId);
  }
}

function getFilmBids(bids: FilmBid[], winners: Record<string, number[]>, completed: number[]) {
  // filter out bids for already processed films
  const remainingBids = bids.filter((bid) => !completed.includes(bid.tmdbId));

  // filter out bids if studio has already won bid in that slot
  const activeBids = remainingBids.filter((bid) => !winners[bid.studioId]?.includes(bid.slot));
  const ignored = remainingBids.filter((bid) => winners[bid.studioId]?.includes(bid.slot));

  // sort remaining bids by amount (desc) and createdAt (asc)
  const sortedBids = activeBids.sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  if (!sortedBids.length) return { bidsForFilm: [], filmId: -1, ignored };

  const filmId = sortedBids[0]!.tmdbId;
  const bidsForFilm = sortedBids.filter((bid) => bid.tmdbId === filmId);

  return { bidsForFilm, filmId, ignored };
}

export async function deleteSessionById(ctx: TRPCContext, id: string) {
  await ctx.prisma.filmBid.deleteMany({ where: { studio: { sessionId: id } } });
  await ctx.prisma.studioFavorite.deleteMany({ where: { studio: { sessionId: id } } });
  await ctx.prisma.studioFilm.deleteMany({ where: { studio: { sessionId: id } } });
  await ctx.prisma.leagueSessionActivity.deleteMany({ where: { sessionId: id } });
  await ctx.prisma.leagueSessionStudio.deleteMany({ where: { sessionId: id } });
  return await ctx.prisma.leagueSession.delete({
    where: { id: id },
  });
}

async function getWinnerAndLosers(ctx: TRPCContext, bids: FilmBid[]) {
  const r = { winner: undefined, losers: undefined };

  for (let i = 0; i < bids.length; i++) {
    const winner = bids[i];
    if (!winner) return r;

    const studio = await ctx.prisma.leagueSessionStudio.findFirst({
      where: { id: winner.studioId },
    });
    if (studio!.budget < winner.amount)
      await ctx.prisma.filmBid.update({
        data: { status: BID_STATUSES.INVALID },
        where: { id: winner.id },
      });
    else return { winner: { ...bids[i], studio }, losers: bids.slice(i + 1) };
  }
  return r;
}
