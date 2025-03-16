import { z } from "zod";

import { SESSION_ACTIVITY_TYPES } from "../../enums";
import { adminProcedure, createTRPCRouter, protectedProcedure } from "../../trpc";
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
      message: `${ctx.session.user.username} manually processed active bids`,
    });

    return processSessionBids(ctx, input.sessionId, new Date());
  });

const processAllBids = protectedProcedure.mutation(async ({ ctx }) => {
  const activeSessions = await ctx.prisma.leagueSession.findMany({
    where: {
      league: { owner: { id: { not: "cm0rtl1gz00046epy0thc8r0l" } } },
      AND: [{ startDate: { lte: new Date() } }, { endDate: { gte: new Date() } }],
    },
  });

  const promises = [];
  for (const session of activeSessions) {
    promises.push(
      (() => {
        void logSessionActivity(ctx, {
          sessionId: session.id,
          type: SESSION_ACTIVITY_TYPES.AUTOMATED,
          message: "Active bids processed",
        });

        void processSessionBids(ctx, session.id, new Date());
      })(),
    );
  }

  await Promise.allSettled(promises);
});

const getLeagues = adminProcedure.query(async ({ ctx }) => {
  return ctx.prisma.league.findMany({ include: { owner: true, members: { include: { user: true } } } });
});

export const adminRouter = createTRPCRouter({
  addStudioFilm,
  processBids,
  processAllBids,
  getLeagues,
});

////////////////
