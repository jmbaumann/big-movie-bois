import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { getByTMDBId } from "../tmdb";

const get = publicProcedure.input(z.object({ active: z.boolean().optional() })).query(async ({ ctx, input }) => {
  const where = input.active ? { AND: [{ startDate: { lte: new Date() } }, { endDate: { gte: new Date() } }] } : {};
  return await ctx.prisma.pollQuestion.findMany({
    include: { answers: { include: { responses: true } }, film: true },
    where,
    orderBy: { startDate: "desc" },
  });
});

const create = protectedProcedure
  .input(
    z.object({
      text: z.string(),
      tmdbId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      answers: z.array(z.object({ text: z.string() })),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const poll = await ctx.prisma.pollQuestion.create({
      data: { text: input.text, tmdbId: input.tmdbId, startDate: input.startDate, endDate: input.endDate },
    });

    const data = input.answers.map((answer, i) => ({
      pollId: poll.id,
      text: answer.text,
      seq: i + 1,
    }));
    const answers = await ctx.prisma.pollAnswer.createMany({ data });

    if (input.tmdbId) await getByTMDBId(ctx, input.tmdbId, { noReturn: true });

    return { ...poll, answers };
  });

const update = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      text: z.string(),
      tmdbId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.pollQuestion.update({ data: input, where: { id: input.id } });
  });

const del = protectedProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.prisma.pollQuestion.delete({ where: { id: input.id } });
    return ctx.prisma.pollAnswer.deleteMany({ where: { pollId: input.id } });
  });

const vote = protectedProcedure
  .input(
    z.object({
      answerId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.pollResponse.create({
      data: {
        answerId: input.answerId,
        userId: ctx.session.user.id,
      },
    });
  });

export const pollRouter = createTRPCRouter({
  get,
  create,
  update,
  delete: del,
  vote,
});
