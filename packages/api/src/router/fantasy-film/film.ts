import { z } from "zod";

import { Prisma } from "@repo/db";

import { SESSION_ACTIVITY_TYPES, STUDIO_SLOT_TYPES } from "../../enums";
import { createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import {
  FilmScores,
  getOpeningWeekendBoxOfficeScore,
  getRatingScore,
  getReverseRatingScore,
  getTotalBoxOfficeScore,
} from "./score";
import { getSessionById, logSessionActivity } from "./session";

type Session = Awaited<ReturnType<typeof getSessionById>>;
type FilmWithTMDB = Prisma.StudioFilmGetPayload<{
  include: { tmdb: true };
}>;
type FilmWithScores = FilmWithTMDB & {
  scores: FilmScores;
};

const swap = protectedProcedure
  .input(z.object({ studioId: z.string(), fromPos: z.number(), toPos: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const inFromPos = await ctx.prisma.studioFilm.findFirst({
      where: { studioId: input.studioId, slot: input.fromPos },
      include: { studio: true },
    });
    const inToPos = await ctx.prisma.studioFilm.findFirst({
      where: { studioId: input.studioId, slot: input.toPos },
    });
    if (!inFromPos) throw "No film to swap";

    await ctx.prisma.studioFilm.update({
      data: { slot: input.toPos },
      where: { id: inFromPos.id },
    });

    const session = await getSessionById(ctx, inFromPos.studio.sessionId);
    const toSlot = session?.settings.teamStructure[input.toPos - 1];
    await logSessionActivity(ctx, {
      sessionId: inFromPos.studio.sessionId,
      studioId: input.studioId,
      tmdbId: inFromPos.tmdbId,
      type: SESSION_ACTIVITY_TYPES.FILM_SWAP,
      message: `{STUDIO} SWAPPED {FILM} into their ${toSlot?.type} slot`,
    });

    if (inToPos) {
      await ctx.prisma.studioFilm.update({
        data: { slot: input.fromPos },
        where: { id: inToPos.id },
      });

      const fromSlot = session?.settings.teamStructure[input.fromPos - 1];
      await logSessionActivity(ctx, {
        sessionId: inFromPos.studio.sessionId,
        studioId: input.studioId,
        tmdbId: inToPos.tmdbId,
        type: SESSION_ACTIVITY_TYPES.FILM_SWAP,
        message: `{STUDIO} SWAPPED {FILM} into their ${fromSlot?.type} slot`,
      });
    }
  });

const trade = protectedProcedure
  .input(z.object({ fromPos: z.number(), toPos: z.number() }))
  .mutation(async ({ ctx, input }) => {});

const drop = protectedProcedure
  .input(z.object({ id: z.string(), bidWar: z.boolean().optional() }))
  .mutation(async ({ ctx, input }) => {
    let recoup;
    if (input.bidWar) {
      const studioFilm = await ctx.prisma.studioFilm.findFirst({ include: { studio: true }, where: { id: input.id } });
      const bid = await ctx.prisma.filmBid.findFirst({
        where: { studioId: studioFilm?.studioId, tmdbId: studioFilm?.tmdbId },
      });
      if (!bid) throw "No bid in records";

      recoup = Math.round(0.8 * bid.amount);
      await ctx.prisma.leagueSessionStudio.update({
        data: { budget: studioFilm!.studio.budget + recoup },
        where: { id: studioFilm!.studioId },
      });
      await ctx.prisma.filmBid.delete({ where: { id: bid.id } });
    }

    return dropStudioFilmById(ctx, input.id, recoup);
  });

const getBid = protectedProcedure
  .input(z.object({ studioId: z.string(), tmdbId: z.number() }))
  .query(async ({ ctx, input }) => {
    return await ctx.prisma.filmBid.findFirst({
      where: { studioId: input.studioId, tmdbId: input.tmdbId },
    });
  });

export const filmRouter = createTRPCRouter({
  swap,
  trade,
  drop,
  getBid,
});

////////////////

export async function getFilmScore(ctx: TRPCContext, session: Session, film: FilmWithScores) {
  let score = 0;
  if (film.scoreOverride) score = film.scoreOverride;

  const slot = session?.settings.teamStructure[film.slot - 1];
  if (!slot) return 0;

  switch (slot.type) {
    case STUDIO_SLOT_TYPES.TOTAL_BOX_OFFICE:
      score = film.scores.totalBoxOffice;
      break;
    case STUDIO_SLOT_TYPES.OPENING_WEEKEND_BOX_OFFICE:
      score = film.scores.openingWeekendBoxOffice;
      break;
    case STUDIO_SLOT_TYPES.TMDB_RATING:
      score = film.scores.rating;
      break;
    case STUDIO_SLOT_TYPES.REVERSE_TMDB_RATING:
      score = film.scores.reverseRating;
      break;
  }

  await ctx.prisma.studioFilm.update({
    data: { score },
    where: { id: film.id },
  });
  return score;
}

export async function getFilmScores(film: FilmWithTMDB) {
  return {
    totalBoxOffice: getTotalBoxOfficeScore(film),
    openingWeekendBoxOffice: getOpeningWeekendBoxOfficeScore(film),
    rating: getRatingScore(film),
    reverseRating: getReverseRatingScore(film),
  };
}

export async function dropStudioFilmById(ctx: TRPCContext, id: string, recoup?: number) {
  const film = await ctx.prisma.studioFilm.findFirst({
    include: { studio: true },
    where: { id },
  });
  if (!film) throw "Invalid";

  await ctx.prisma.studioFilm.delete({ where: { id } });

  await logSessionActivity(ctx, {
    sessionId: film.studio.sessionId,
    studioId: film.studioId,
    tmdbId: film.tmdbId,
    type: SESSION_ACTIVITY_TYPES.FILM_DROP,
    message: `{STUDIO} DROPPED {FILM}` + (recoup ? ` and recouped $${recoup}` : ""),
  });
}
