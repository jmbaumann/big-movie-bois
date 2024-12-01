import { format } from "date-fns";
import { z } from "zod";

import { Prisma } from "@repo/db";

import type { TRPCContext } from "../../trpc";
import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const getAll = adminProcedure.query(async ({ ctx }) => {
  return ctx.prisma.user.findMany({ orderBy: { createdAt: "asc" } });
});

const search = protectedProcedure.input(z.object({ keyword: z.string() })).query(async ({ ctx, input }) => {
  return ctx.prisma.user.findMany({
    select: { id: true, username: true },
    where: { username: { contains: input.keyword, mode: "insensitive" } },
  });
});

const update = protectedProcedure
  .input(z.object({ id: z.string(), username: z.string().min(3).max(20) }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.user.update({ data: input, where: { id: input.id } });
  });

const checkAvailable = publicProcedure.input(z.object({ keyword: z.string() })).mutation(async ({ ctx, input }) => {
  const found = await ctx.prisma.user.findFirst({
    select: { id: true, username: true },
    where: { username: { equals: input.keyword, mode: "insensitive" } },
  });
  return !found;
});

export const userRouter = createTRPCRouter({
  getAll,
  search,
  update,
  checkAvailable,
});

////////////////
