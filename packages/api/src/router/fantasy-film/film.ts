import { inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

import { LeagueSessionStudio as Studio, StudioFilm } from "@repo/db";

import { SESSION_ACTIVITY_TYPES, STUDIO_SLOT_TYPES } from "../../enums";
import { AppRouter } from "../../root";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  TRPCContext,
} from "../../trpc";
import { getByTMDBId } from "../tmdb";
import {
  FilmScores,
  getOpeningWeekendBoxOfficeScore,
  getRatingScore,
  getReverseRatingScore,
  getTotalBoxOfficeScore,
} from "./score";
import { getSessionById, logSessionActivity } from "./session";

type Session = Awaited<ReturnType<typeof getSessionById>>;
type TMDBDetails = Awaited<ReturnType<typeof getByTMDBId>>;
type FilmWithTMDB = StudioFilm & { tmdb: TMDBDetails };
type FilmWithScores = FilmWithTMDB & {
  scores: FilmScores;
};

const swap = protectedProcedure
  .input(
    z.object({ studioId: z.string(), fromPos: z.number(), toPos: z.number() }),
  )
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
    const filmDetails = await getByTMDBId(inFromPos.tmdbId);
    await logSessionActivity(ctx, {
      sessionId: inFromPos.studio.sessionId,
      studioId: input.studioId,
      type: SESSION_ACTIVITY_TYPES.FILM_SWAP,
      message: `${inFromPos.studio.name} SWAPPED ${filmDetails.details.title} into their ${toSlot?.type} slot`,
    });

    if (inToPos) {
      await ctx.prisma.studioFilm.update({
        data: { slot: input.fromPos },
        where: { id: inToPos.id },
      });

      const fromSlot = session?.settings.teamStructure[input.fromPos - 1];
      const filmDetails = await getByTMDBId(inToPos.tmdbId);
      await logSessionActivity(ctx, {
        sessionId: inFromPos.studio.sessionId,
        studioId: input.studioId,
        type: SESSION_ACTIVITY_TYPES.FILM_SWAP,
        message: `${inFromPos.studio.name} SWAPPED ${filmDetails.details.title} into their ${fromSlot?.type} slot`,
      });
    }
  });

const trade = protectedProcedure
  .input(z.object({ fromPos: z.number(), toPos: z.number() }))
  .mutation(async ({ ctx, input }) => {});

const drop = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return dropStudioFilmById(ctx, input.id);
  });

export const filmRouter = createTRPCRouter({
  swap,
  trade,
  drop,
});

////////////////

export async function getFilmScore(
  ctx: TRPCContext,
  session: Session,
  film: FilmWithScores,
) {
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
    case STUDIO_SLOT_TYPES.IMDB_RATING:
      score = film.scores.rating;
      break;
    case STUDIO_SLOT_TYPES.REVERSE_IMDB_RATING:
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

export async function dropStudioFilmById(ctx: TRPCContext, id: string) {
  const film = await ctx.prisma.studioFilm.findFirst({
    where: { id },
    include: { studio: true },
  });
  if (!film) throw "Invalid";

  await ctx.prisma.studioFilm.delete({ where: { id } });

  const filmDetails = await getByTMDBId(film.tmdbId);
  await logSessionActivity(ctx, {
    sessionId: film.studio.sessionId,
    studioId: film.studioId,
    type: SESSION_ACTIVITY_TYPES.FILM_DROP,
    message: `${film.studio.name} DROPPED ${filmDetails.details.title}`,
  });
}
