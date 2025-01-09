import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const get = publicProcedure
  .input(z.object({ id: z.string().optional(), awardShowYearId: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const where = input.id ? { id: input.id } : { awardShowYearId: input.awardShowYearId, default: true };

    const group = await ctx.prisma.awardShowGroup.findFirst({
      include: {
        awardShowYear: {
          include: {
            awardShow: true,
            categories: { include: { nominees: { orderBy: { name: "asc" } } }, orderBy: { order: "asc" } },
          },
        },
        owner: { include: {} },
      },
      where,
    });

    if (!group) throw new TRPCError({ message: "No group", code: "NOT_FOUND" });

    const leaderboard = await ctx.prisma.awardShowPick.groupBy({
      by: ["userId"],
      where: {
        groupId: group.id,
        nominee: {
          winner: true,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 20,
    });

    const leaderboardWithUsers = await Promise.all(
      leaderboard.map(async (entry) => {
        const user = await ctx.prisma.user.findUnique({
          where: { id: entry.userId },
          select: { username: true },
        });
        return {
          userId: entry.userId,
          userName: user?.username || "",
          correctPicks: entry._count.id,
        };
      }),
    );

    return { ...group, leaderboard: leaderboardWithUsers };
  });

const getPublic = publicProcedure.input(z.object({ awardShowYearId: z.string() })).query(async ({ ctx, input }) => {
  const groups = await ctx.prisma.awardShowGroup.findMany({
    where: { awardShowYearId: input.awardShowYearId, public: true, picks: { none: { userId: ctx.session?.user.id } } },
  });

  const r = [];
  for (const group of groups) {
    const entries = await ctx.prisma.awardShowPick.groupBy({
      by: ["userId"],
      where: {
        groupId: group.id,
      },
    });
    r.push({ ...group, entries: entries.length });
  }

  return r;
});

const getMy = protectedProcedure.input(z.object({ awardShowYearId: z.string() })).query(async ({ ctx, input }) => {
  const groups = await ctx.prisma.awardShowGroup.findMany({
    where: {
      awardShowYearId: input.awardShowYearId,
      OR: [{ ownerId: ctx.session.user.id }, { picks: { some: { userId: ctx.session.user.id } } }],
    },
  });

  const r = [];
  for (const group of groups) {
    const entries = await ctx.prisma.awardShowPick.groupBy({
      by: ["userId"],
      where: {
        groupId: group.id,
      },
    });
    r.push({ ...group, entries: entries.length });
  }

  return r;
});

const myPicks = protectedProcedure
  .input(z.object({ userId: z.string(), groupId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.awardShowPick.findMany({ where: { userId: input.userId, groupId: input.groupId } });
  });

const create = protectedProcedure
  .input(z.object({ awardShowYearId: z.string(), name: z.string(), ownerId: z.string(), public: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.awardShowGroup.create({ data: input });
  });

const pick = protectedProcedure
  .input(z.array(z.object({ userId: z.string(), groupId: z.string(), categoryId: z.string(), nomineeId: z.string() })))
  .mutation(async ({ ctx, input }) => {
    const userId = input[0]?.userId;
    const groupId = input[0]?.groupId;

    if (userId && groupId) {
      // const group = await ctx.prisma.awardShowGroup.findFirst({where: {id: groupId}})
      // if (locked) return;

      await ctx.prisma.awardShowPick.deleteMany({
        where: { AND: [{ userId }, { groupId }] },
      });
      return ctx.prisma.awardShowPick.createMany({ data: input });
    }
  });

export const awardShowGroupRouter = createTRPCRouter({
  get,
  getPublic,
  getMy,
  myPicks,
  create,
  pick,
});
