import { z } from "zod";

import { SESSION_ACTIVITY_TYPES } from "../../enums";
import { createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { logSessionActivity, processSessionBids } from "./session";

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
  processBids,
});

////////////////
