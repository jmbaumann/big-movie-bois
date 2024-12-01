import { format } from "date-fns";
import { z } from "zod";

import { Prisma } from "@repo/db";

import type { TRPCContext } from "../../trpc";
import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const getAll = adminProcedure.query(async ({ ctx }) => {
  return ctx.prisma.contactMessage.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
});

const create = protectedProcedure
  .input(z.object({ userId: z.string(), email: z.string(), body: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.contactMessage.create({ data: input });
  });

export const contactRouter = createTRPCRouter({
  getAll,
  create,
});

////////////////
