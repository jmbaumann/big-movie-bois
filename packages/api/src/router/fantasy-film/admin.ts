import { format } from "date-fns";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  TRPCContext,
} from "../../trpc";
import { processSessionBids } from "./session";

const processBids = protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return processSessionBids(ctx, input.sessionId, new Date());
  });

export const adminRouter = createTRPCRouter({
  processBids,
});

////////////////
