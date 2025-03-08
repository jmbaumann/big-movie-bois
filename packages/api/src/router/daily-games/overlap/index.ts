import { format, sub } from "date-fns";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../../../trpc";
import { getByTMDBId } from "../../tmdb";

const getAnswer = publicProcedure.input(z.object({ date: z.string().optional() })).query(async ({ ctx, input }) => {
  const date = input.date ?? format(new Date(), "yyyy-MM-dd");
  const data = await ctx.prisma.overlapAnswer.findFirst({
    include: { tmdb: { include: { cast: true, crew: true } } },
    where: { date },
  });
  if (!data) return;

  const avg = await ctx.prisma.overlapResult.aggregate({
    _avg: {
      numGuesses: true,
    },
    where: { answerId: data.id, numGuesses: { gte: 1 } },
  });

  return {
    ...data,
    averageGuesses: Math.round(avg._avg.numGuesses ?? 4),
  };
});

const getStats = protectedProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
  const results = await ctx.prisma.overlapResult.findMany({ where: { userId: input.userId } });

  return {
    gamesPlayed: results.length,
    scores: [
      results.filter((e) => e.numGuesses === 1).length,
      results.filter((e) => e.numGuesses === 2).length,
      results.filter((e) => e.numGuesses === 3).length,
      results.filter((e) => e.numGuesses === 4).length,
      results.filter((e) => e.numGuesses === 5).length,
      results.filter((e) => e.numGuesses >= 6).length,
    ],
  };
});

const getMyResult = protectedProcedure.input(z.object({ date: z.string() })).query(async ({ ctx, input }) => {
  const todaysAnswer = await ctx.prisma.overlapAnswer.findFirst({
    where: { date: input.date },
  });
  if (!todaysAnswer) return;

  return ctx.prisma.overlapResult.findFirst({
    include: { user: { select: { username: true } } },
    where: { answerId: todaysAnswer.id, userId: ctx.session.user.id },
  });
});

const getArchive = publicProcedure.input(z.object({ date: z.string() })).query(async ({ ctx, input }) => {
  return ctx.prisma.overlapAnswer.findMany({
    select: { id: true, date: true },
    where: { date: { lt: input.date, gte: "2025-01-09" } },
    orderBy: { date: "desc" },
  });
});

const createAnswer = protectedProcedure
  .input(
    z.object({
      date: z.string(),
      tmdbId: z.number(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await getByTMDBId(ctx, input.tmdbId);
    return ctx.prisma.overlapAnswer.create({ data: input });
  });

const updateAnswer = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      date: z.string(),
      tmdbId: z.number(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await getByTMDBId(ctx, input.tmdbId);
    return ctx.prisma.overlapAnswer.update({ data: input, where: { id: input.id } });
  });

const deleteAnswer = protectedProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.overlapAnswer.delete({ where: { id: input.id } });
  });

const getAnswers = adminProcedure
  .input(z.object({ date: z.string(), archive: z.boolean().optional() }))
  .query(async ({ ctx, input }) => {
    const yesterday = format(sub(input.date, { days: 1 }), "yyyy-MM-dd");
    return ctx.prisma.overlapAnswer.findMany({
      include: { tmdb: { include: { cast: true, crew: true } } },
      where: { date: input.archive ? { lte: yesterday } : { gte: yesterday } },
      orderBy: { date: input.archive ? "desc" : "asc" },
    });
  });

const saveScore = protectedProcedure
  .input(z.object({ answerId: z.string(), userId: z.string(), numGuesses: z.number().min(0) }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.overlapResult.create({ data: input });
  });

const getResults = adminProcedure.input(z.object({ date: z.string() })).query(async ({ ctx, input }) => {
  const todaysAnswer = await ctx.prisma.overlapAnswer.findFirst({
    where: { date: input.date },
  });
  if (!todaysAnswer) return;

  return ctx.prisma.overlapResult.findMany({
    include: { user: { select: { username: true } } },
    where: { answerId: todaysAnswer.id },
  });
});

export const overlapRouter = createTRPCRouter({
  getAnswer,
  getStats,
  getMyResult,
  getArchive,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  getAnswers,
  saveScore,
  getResults,
});
