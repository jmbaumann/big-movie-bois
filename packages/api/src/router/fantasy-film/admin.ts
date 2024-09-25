import { z } from "zod";

import { SESSION_ACTIVITY_TYPES } from "../../enums";
import { createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { logSessionActivity, processSessionBids } from "./session";

const addStudioFilm = protectedProcedure
  .input(z.object({ studioId: z.string(), tmdbId: z.number(), slot: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const studioFilm = await ctx.prisma.studioFilm.create({
      data: {
        tmdbId: input.tmdbId,
        studioId: input.studioId,
        slot: input.slot,
        acquiredAt: new Date(),
      },
    });

    const studio = await ctx.prisma.leagueSessionStudio.findFirst({ where: { id: input.studioId } });
    await logSessionActivity(ctx, {
      sessionId: studio!.sessionId,
      studioId: input.studioId,
      tmdbId: input.tmdbId,
      type: SESSION_ACTIVITY_TYPES.ADMIN_ACTION,
      message: `Admin ADDED {FILM} to {STUDIO}`,
    });

    return studioFilm;
  });

const processBids = protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await logSessionActivity(ctx, {
      sessionId: input.sessionId,
      type: SESSION_ACTIVITY_TYPES.ADMIN_ACTION,
      message: `${ctx.session.user.name} manually processed active bids`,
    });

    return processSessionBids(ctx, input.sessionId, new Date());
  });

export const adminRouter = createTRPCRouter({
  addStudioFilm,
  processBids,
});

////////////////
