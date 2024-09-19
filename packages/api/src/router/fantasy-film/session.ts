import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { z } from "zod";

import { FilmBid, StudioFilm } from "@repo/db";

import { BID_STATUSES, FILM_ACQUISITION_TYPES, SESSION_ACTIVITY_TYPES } from "../../enums";
import { AppRouter } from "../../root";
import { createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { getByTMDBId } from "../tmdb";
import { dropStudioFilmById } from "./film";
import { createManyStudios } from "./studio";
import { createLeagueSessionInputObj, LeagueSessionSettings, logActivityObj, updateLeagueSessionInputObj } from "./zod";

type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];
type StudioFilmDetails = StudioFilm & { tmdb: TMDBMovie };

const getById = protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
  return await getSessionById(ctx, input.id);
});

const create = protectedProcedure.input(createLeagueSessionInputObj).mutation(async ({ ctx, input }) => {
  if (!input.leagueId) throw "No League ID provided";

  const data = {
    leagueId: input.leagueId,
    slug: `${format(input.startDate, "yyyy-MM-dd")}-${format(input.endDate, "yyyy-MM-dd")}`,
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
    slug: `${format(input.startDate, "yyyy-MM-dd")}-${format(input.endDate, "yyyy-MM-dd")}`,
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

const getAcquiredFilms = protectedProcedure
  .input(z.object({ sessionId: z.string(), includeDetails: z.boolean().optional() }))
  .query(async ({ ctx, input }) => {
    const list = await ctx.prisma.studioFilm.findMany({
      where: { studio: { sessionId: { equals: input.sessionId } } },
    });
    if (!input.includeDetails) return list;

    for (const film of list as StudioFilmDetails[]) film.tmdb = await getByTMDBId(film.tmdbId);

    return list;
  });

const getStandings = protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
  return ctx.prisma.leagueSessionStudio.findMany({
    where: { sessionId: input.sessionId },
    orderBy: { score: "desc" },
  });
});

const getBids = protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
  return await Promise.all(
    (
      await ctx.prisma.filmBid.findMany({
        where: {
          studio: { sessionId: input.sessionId },
          status: BID_STATUSES.PENDING,
        },
        include: { studio: { select: { name: true } } },
      })
    ).map(async (bid) => ({
      ...bid,
      film: await getByTMDBId(bid.tmdbId),
    })),
  );
});

const getLogs = protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
  return ctx.prisma.leagueSessionActivity.findMany({
    where: input,
    include: { session: { select: { leagueId: true } }, studio: { select: { name: true, ownerId: true } }, film: true },
    orderBy: { timestamp: "desc" },
  });
});

export const leagueSessionRouter = createTRPCRouter({
  getById,
  create,
  update,
  getAcquiredFilms,
  getStandings,
  getBids,
  getLogs,
});

////////////////

export async function getSessionById(ctx: TRPCContext, id: string) {
  const session = await ctx.prisma.leagueSession.findFirst({
    where: { id },
    include: {
      studios: { orderBy: { score: "desc" } },
      league: { select: { ownerId: true } },
    },
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
    where: {
      studio: { sessionId },
      status: BID_STATUSES.PENDING,
      createdAt: { lte: timestamp },
    },
    orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
  });

  const byTMDBId: Record<number, typeof bids> = {};
  bids.forEach((e) => {
    if (!byTMDBId[e.tmdbId]) byTMDBId[e.tmdbId] = [];
    byTMDBId[e.tmdbId]?.push(e);
  });

  for (const tmdbId in byTMDBId) {
    const { winner, losers } = await getWinnerAndLosers(ctx, byTMDBId[tmdbId]!);
    if (!winner) continue;

    await ctx.prisma.filmBid.update({
      data: { status: BID_STATUSES.WON },
      where: { id: winner.id },
    });
    await ctx.prisma.leagueSessionStudio.update({
      data: { budget: winner.studio!.budget - (winner.amount ?? 0) },
      where: { id: winner.studioId },
    });

    const toDrop = await ctx.prisma.studioFilm.findFirst({
      where: { studioId: winner.studioId, slot: winner.slot },
    });
    if (toDrop) await dropStudioFilmById(ctx, toDrop.id);

    const film = await ctx.prisma.studioFilm.create({
      data: {
        tmdbId: winner.tmdbId!,
        title: winner.title!,
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
      filmId: film.id,
      type: SESSION_ACTIVITY_TYPES.BID_WON,
      message: `{STUDIO} ADDED ${film.title} in their ${slot?.type} slot`,
    });

    if (losers?.length) {
      await ctx.prisma.filmBid.updateMany({
        data: { status: BID_STATUSES.LOST },
        where: { id: { in: losers?.map((e) => e.id) } },
      });
    }
  }
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
