import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const get = protectedProcedure.query(async ({ ctx }) => {
  return ctx.prisma.awardShowYear.findMany({
    include: { awardShow: { select: { name: true } } },
    orderBy: { available: "desc" },
  });
});

const getShows = protectedProcedure.query(async ({ ctx }) => {
  return ctx.prisma.awardShow.findMany();
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
      },
    });

    return year;
  });

const saveCategories = adminProcedure
  .input(
    z.array(
      z.object({
        id: z.string().optional(),
        awardShowYearId: z.string(),
        name: z.string(),
      }),
    ),
  )
  .mutation(async ({ ctx, input }) => {
    const data = input.map((e, i) => ({
      ...e,
      order: i + 1,
    }));
    const toCreate = data.filter((e) => !e.id);
    const toUpdate = data.filter((e) => e.id);

    const updatePromises = toUpdate.map((e) => ctx.prisma.awardShowCategory.update({ data: e, where: { id: e.id } }));

    if (updatePromises.length) await Promise.allSettled(updatePromises);
    if (toCreate.length) await ctx.prisma.awardShowCategory.createMany({ data: toCreate });
  });

const saveNominees = adminProcedure
  .input(
    z.array(
      z.object({
        id: z.string().optional(),
        categoryId: z.string(),
        tmdbId: z.number().optional(),
        name: z.string(),
        image: z.string().optional(),
        order: z.number().optional(),
        winner: z.boolean().default(false),
      }),
    ),
  )
  .mutation(async ({ ctx, input }) => {
    const toCreate = input.filter((e) => !e.id);
    const toUpdate = input.filter((e) => e.id);

    const updatePromises = toUpdate.map((e) => ctx.prisma.awardShowNominee.update({ data: e, where: { id: e.id } }));

    if (updatePromises.length) await Promise.allSettled(updatePromises);
    if (toCreate.length) await ctx.prisma.awardShowNominee.createMany({ data: toCreate });
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
  getShows,
  create,
  addYear,
  saveCategories,
  saveNominees,
  createGroup,
});
