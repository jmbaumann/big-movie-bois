import { sub } from "date-fns";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { draftEvent, socketEvent } from "../../websocket";

const get = publicProcedure.query(async ({ ctx }) => {
  return ctx.prisma.awardShowYear.findMany({
    include: {
      awardShow: { select: { name: true } },
      categories: { include: { nominees: { orderBy: { name: "asc" } } }, orderBy: { announced: "desc", order: "asc" } },
    },
    orderBy: { available: "desc" },
  });
});

const getBySlugYear = publicProcedure
  .input(z.object({ slug: z.string(), year: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.awardShowYear.findFirst({ where: { awardShow: { slug: input.slug }, year: input.year } });
  });

const getShows = protectedProcedure.query(async ({ ctx }) => {
  return ctx.prisma.awardShow.findMany();
});

const getActive = publicProcedure.query(async ({ ctx }) => {
  const actives = await ctx.prisma.awardShowYear.findMany({
    include: {
      awardShow: { select: { name: true, slug: true } },
      categories: { include: { nominees: { orderBy: { name: "asc" } } }, orderBy: { order: "asc" } },
      groups: { where: { default: true } },
    },
    where: { available: { lte: new Date() }, locked: { gte: sub(new Date(), { weeks: 2 }) } },
    orderBy: { available: "desc" },
  });

  const r = [];
  for (const active of actives) {
    const entries = await ctx.prisma.awardShowPick.groupBy({
      by: ["userId", "groupId"],
      where: {
        group: { awardShowYearId: active.id },
      },
    });
    r.push({ ...active, entries: entries.length });
  }

  return r;
});

const getPast = publicProcedure.query(async ({ ctx }) => {
  const actives = await ctx.prisma.awardShowYear.findMany({
    include: {
      awardShow: { select: { name: true, slug: true } },
      categories: { include: { nominees: { orderBy: { name: "asc" } } } },
      groups: { where: { default: true } },
    },
    where: { locked: { lte: sub(new Date(), { days: 2 }) }, available: { not: null } },
    orderBy: { available: "desc" },
    take: 5,
  });

  const r = [];
  for (const active of actives) {
    const entries = await ctx.prisma.awardShowPick.groupBy({
      by: ["userId", "groupId"],
      where: {
        group: { awardShowYearId: active.id },
      },
    });
    r.push({ ...active, entries: entries.length });
  }

  return r;
});

const create = adminProcedure
  .input(
    z.object({
      slug: z.string(),
      name: z.string(),
      image: z.string(),
      website: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.awardShow.create({ data: input });
  });

const addYear = adminProcedure
  .input(
    z.object({
      awardShowId: z.string(),
      year: z.string(),
      available: z.date().optional(),
      locked: z.date(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const year = await ctx.prisma.awardShowYear.create({ data: input });
    await ctx.prisma.awardShowGroup.create({
      data: {
        awardShowYearId: year.id,
        ownerId: "cm0rtl1gz00046epy0thc8r0l",
        name: "Big Movie Bois",
        public: true,
        default: true,
      },
    });

    return year;
  });

const updateYear = adminProcedure
  .input(
    z.object({
      id: z.string(),
      awardShowId: z.string(),
      year: z.string(),
      available: z.date().optional(),
      locked: z.date(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.awardShowYear.update({ data: input, where: { id: input.id } });
  });

const saveCategories = adminProcedure
  .input(
    z.object({
      id: z.string().optional(),
      awardShowYearId: z.string(),
      name: z.string(),
      order: z.number(),
      nominees: z
        .array(
          z.object({
            id: z.string().optional(),
            name: z.string(),
            subtext: z.string().optional(),
            image: z.string().optional(),
            tmdbId: z.number().optional(),
            order: z.number().optional(),
            winner: z.boolean().default(false),
          }),
        )
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const category = input.id
      ? await ctx.prisma.awardShowCategory.update({ data: { name: input.name }, where: { id: input.id } })
      : await ctx.prisma.awardShowCategory.create({
          data: { awardShowYearId: input.awardShowYearId, name: input.name, order: input.order },
        });

    if (input.nominees?.length) {
      const data = input.nominees.map((e, i) => ({ ...e, categoryId: category.id, order: i + 1 }));

      const toCreate = data.filter((e) => !e.id);
      const toUpdate = data.filter((e) => e.id);

      const updatePromises = toUpdate.map((e) => ctx.prisma.awardShowNominee.update({ data: e, where: { id: e.id } }));

      if (updatePromises.length) await Promise.allSettled(updatePromises);
      if (toCreate.length) await ctx.prisma.awardShowNominee.createMany({ data: toCreate });
    }
  });

const updateWinner = adminProcedure
  .input(z.object({ awardShowYearId: z.string(), nomineeId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const category = await ctx.prisma.awardShowCategory.findFirst({
      where: { nominees: { some: { id: input.nomineeId } } },
    });

    if (category)
      await ctx.prisma.awardShowCategory.update({
        data: { announced: new Date() },
        where: { id: category.id },
      });

    await ctx.prisma.awardShowNominee.update({ data: { winner: true }, where: { id: input.nomineeId } });
    return await socketEvent<{ done: boolean }>(`pick-em:${input.awardShowYearId}:winner-update`, { done: true });
  });

const createGroup = protectedProcedure
  .input(
    z.object({
      awardShowYearId: z.string(),
      ownerId: z.string(),
      name: z.string(),
      public: z.boolean().default(false),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.awardShowGroup.create({ data: input });
  });

export const awardShowRouter = createTRPCRouter({
  get,
  getBySlugYear,
  getShows,
  getActive,
  getPast,
  create,
  addYear,
  updateYear,
  saveCategories,
  updateWinner,
  createGroup,
});
