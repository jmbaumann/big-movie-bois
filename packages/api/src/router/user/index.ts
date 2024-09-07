import { format } from "date-fns";
import { z } from "zod";

import { Prisma } from "@repo/db";

import type { TRPCContext } from "../../trpc";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";

const search = protectedProcedure
  .input(z.object({ keyword: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.user.findMany({
      select: { id: true, name: true },
      where: { name: { contains: input.keyword, mode: "insensitive" } },
    });
  });

export const userRouter = createTRPCRouter({
  search,
});

////////////////
