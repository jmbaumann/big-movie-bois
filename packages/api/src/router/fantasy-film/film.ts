import { inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

import { SESSION_ACTIVITY_TYPES } from "../../enums";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  TRPCContext,
} from "../../trpc";
import { getByTMDBId } from "../tmdb";
import { getSessionById, logSessionActivity } from "./session";

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
