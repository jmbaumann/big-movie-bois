import { format, sub } from "date-fns";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../../trpc";
import { getByTMDBId } from "../../tmdb";

const getAnswer = publicProcedure.input(z.object({ date: z.string().optional() })).query(async ({ ctx, input }) => {
  const date = input.date ?? format(new Date(), "yyyy-MM-dd");
  return ctx.prisma.overlapAnswer.findFirst({
    include: { tmdb: { include: { cast: true, crew: true } } },
    where: { date },
  });
});

const getArchive = publicProcedure.query(async ({ ctx }) => {
  return ctx.prisma.overlapAnswer.findMany({
    select: { id: true, date: true },
    where: { date: { lt: format(new Date(), "yyyy-MM-dd") } },
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

const getAnswers = publicProcedure
  .input(z.object({ archive: z.boolean().optional() }))
  .query(async ({ ctx, input }) => {
    const yesterday = format(sub(new Date(), { days: 1 }), "yyyy-MM-dd");
    return ctx.prisma.overlapAnswer.findMany({
      include: { tmdb: { include: { cast: true, crew: true } } },
      where: { date: { gte: yesterday } },
      orderBy: { date: "asc" },
    });
  });

export const overlapRouter = createTRPCRouter({
  getAnswer,
  getArchive,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  getAnswers,
});
