import { z } from "zod";

import { SESSION_ACTIVITY_TYPES } from "../../enums";
import { createTRPCRouter, cronProcedure } from "../../trpc";
import { logSessionActivity, processSessionBids } from "../fantasy-film/session";
import { updateMasterFantasyFilmList } from "../tmdb";

const updateFilmList = cronProcedure
  .meta({ openapi: { method: "POST", path: "/update-films" } })
  .input(z.object({}).optional())
  .output(z.boolean())
  .mutation(async ({ ctx }) => {
    await updateMasterFantasyFilmList(ctx);
    return true;
  });

const processAllBids = cronProcedure
  .meta({ openapi: { method: "POST", path: "/process-bids" } })
  .input(z.object({}).optional())
  .output(z.boolean())
  .mutation(async ({ ctx }) => {
    const activeSessions = await ctx.prisma.leagueSession.findMany({
      where: {
        leagueId: { not: "cm18qkt8o00056e9iscpz7ym8" },
        AND: [{ startDate: { lte: new Date() } }, { endDate: { gte: new Date() } }],
      },
    });

    const promises = [];
    for (const session of activeSessions) {
      promises.push(
        (() => {
          logSessionActivity(ctx, {
            sessionId: session.id,
            type: SESSION_ACTIVITY_TYPES.AUTOMATED,
            message: "Active bids processed",
          });

          processSessionBids(ctx, session.id, new Date());
        })(),
      );
    }

    await Promise.allSettled(promises);

    return true;
  });

export const cronRouter = createTRPCRouter({
  processAllBids,
  updateFilmList,
});

////////////////
