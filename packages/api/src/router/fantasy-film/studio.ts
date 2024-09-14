import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { z } from "zod";

import { StudioFilm } from "@repo/db";

import { AppRouter } from "../../root";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  TRPCContext,
} from "../../trpc";
import { getByTMDBId } from "../tmdb";
import { createLeagueSessionStudioObj } from "./zod";

type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];
type StudioFilmDetails = StudioFilm & { tmdb: TMDBMovie };

const getMyStudio = protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    const studio = await ctx.prisma.leagueSessionStudio.findFirst({
      where: { sessionId: input.sessionId, ownerId: ctx.session.user.id },
      include: { films: true },
    });
    if (!studio) throw "No studio found";

    for (const film of studio.films as StudioFilmDetails[])
      film.tmdb = await getByTMDBId(film.tmdbId);

    return studio;
  });

const getOpposingStudios = protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.prisma.leagueSessionStudio.findMany({
      where: {
        sessionId: input.sessionId,
        ownerId: { notIn: [ctx.session.user.id] },
      },
    });
  });

const create = protectedProcedure
  .input(createLeagueSessionStudioObj)
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findFirst({
      where: { id: input.ownerId },
    });
    const name = `${user?.name}'s Studio`;
    return await ctx.prisma.leagueSessionStudio.create({
      data: {
        sessionId: input.sessionId,
        ownerId: input.ownerId,
        name,
        createdAt: new Date(),
      },
    });
  });

const addFavorite = protectedProcedure
  .input(z.object({ studioId: z.string(), tmdbId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.studioFavorite.create({ data: input });
  });

const removeFavorite = protectedProcedure
  .input(z.object({ studioId: z.string(), tmdbId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.studioFavorite.delete({
      where: { studioId_tmdbId: input },
    });
  });

const getFavorites = protectedProcedure
  .input(z.object({ studioId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.prisma.studioFavorite.findMany({ where: input });
  });

export const studioRouter = createTRPCRouter({
  getMyStudio,
  getOpposingStudios,
  create,
  addFavorite,
  removeFavorite,
  getFavorites,
});

////////////////

export async function createManyStudios(
  ctx: TRPCContext,
  input: z.infer<typeof createLeagueSessionStudioObj>[],
) {
  const users = await ctx.prisma.user.findMany({
    where: { id: { in: input.map((e) => e.ownerId) } },
  });
  const data = input.map((e) => ({
    ...createLeagueSessionStudioObj.parse(e),
    name: `${users.find((u) => u.id === e.ownerId)?.name}'s Studio`,
    createdAt: new Date(),
  }));
  return await ctx.prisma.leagueSessionStudio.createMany({
    data,
  });
}
