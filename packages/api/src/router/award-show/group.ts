import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { randomString } from "../../utils";

const search = protectedProcedure
  .input(z.object({ keyword: z.string(), awardShowYearId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.awardShowGroup.findMany({
      select: { id: true, name: true, slug: true },
      where: {
        awardShowYearId: input.awardShowYearId,
        public: true,
        default: false,
        OR: [
          { name: { contains: input.keyword, mode: "insensitive" } },
          { owner: { username: { contains: input.keyword, mode: "insensitive" } } },
        ],
      },
    });
  });

const get = publicProcedure
  .input(z.object({ id: z.string().optional(), awardShowYearId: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const where = input.id
      ? { OR: [{ id: input.id }, { slug: input.id }] }
      : { awardShowYearId: input.awardShowYearId, default: true };

    const group = await ctx.prisma.awardShowGroup.findFirst({
      include: {
        awardShowYear: {
          include: {
            awardShow: true,
            categories: {
              include: { nominees: { orderBy: { name: "asc" } } },
              orderBy: [{ announced: { sort: "desc", nulls: "last" } }, { order: "asc" }],
            },
          },
        },
        owner: { include: {} },
      },
      where,
    });

    if (!group) throw new TRPCError({ message: "No group", code: "NOT_FOUND" });

    const picksByNominee = await ctx.prisma.awardShowPick.groupBy({
      by: ["nomineeId", "categoryId"],
      where: { groupId: group.id },
      _count: { id: true },
    });

    const totalPicksByCategory: Record<string, number> = {};

    picksByNominee.forEach((entry) => {
      totalPicksByCategory[entry.categoryId] = (totalPicksByCategory[entry.categoryId] || 0) + entry._count.id;
    });

    const pickPercentages = Object.fromEntries(
      picksByNominee.map((entry) => [
        entry.nomineeId,
        (totalPicksByCategory[entry.categoryId] || 0) > 0
          ? Math.round((entry._count.id / (totalPicksByCategory[entry.categoryId] || 0)) * 100 * 100) / 100
          : 0,
      ]),
    );

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
      // take: 20,
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
          // rank: 0,
        };
      }),
    );

    const noPointsYet = await ctx.prisma.awardShowPick.groupBy({
      by: ["userId"],
      where: {
        groupId: group.id,
        userId: { notIn: leaderboardWithUsers.map((e) => e.userId) },
      },
    });

    const otherUsers = await ctx.prisma.user.findMany({
      select: { id: true, username: true },
      where: {
        id: { in: noPointsYet.map((e) => e.userId) },
      },
    });

    for (const user of otherUsers)
      leaderboardWithUsers.push({
        userId: user.id,
        userName: user.username || "",
        correctPicks: 0,
      });

    if (ctx.session?.user.id && !leaderboardWithUsers.find((e) => e.userId === ctx.session?.user.id)) {
      // const userScore = await ctx.prisma.awardShowPick.groupBy({
      //   by: ["userId"],
      //   where: {
      //     groupId: group.id,
      //     nominee: { winner: true },
      //     userId: ctx.session.user.id,
      //   },
      //   _count: { id: true },
      // });
      // if (userScore.length > 0) {
      //   const correctPicks = userScore[0]!._count.id;
      //   const rank = await ctx.prisma.awardShowPick.groupBy({
      //     by: ["userId"],
      //     where: {
      //       groupId: group.id,
      //       nominee: { winner: true },
      //     },
      //     _count: { id: true },
      //     having: {
      //       id: { _count: { gt: correctPicks } },
      //     },
      //   });
      //   const user = await ctx.prisma.user.findUnique({
      //     where: { id: ctx.session.user.id },
      //     select: { username: true },
      //   });
      //   leaderboardWithUsers.push({
      //     userId: ctx.session.user.id,
      //     userName: user?.username || "",
      //     correctPicks,
      //     rank: rank.length + 1,
      //   });
      // }
    }

    return {
      ...group,
      awardShowYear: {
        ...group.awardShowYear,
        categories: group.awardShowYear.categories.map((category) => ({
          ...category,
          nominees: category.nominees.map((nominee) => ({
            ...nominee,
            percentage: pickPercentages[nominee.id] || 0,
          })),
        })),
      },
      leaderboard: leaderboardWithUsers,
    };
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
    const slug = randomString(6);
    return ctx.prisma.awardShowGroup.create({ data: { ...input, slug } });
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
  search,
  get,
  getPublic,
  getMy,
  myPicks,
  create,
  pick,
});
