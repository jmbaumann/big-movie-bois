import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { z } from "zod";

import { LeagueSessionStudio, Prisma } from "@repo/db";

import { BID_STATUSES } from "../../enums";
import { AppRouter } from "../../root";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  TRPCContext,
} from "../../trpc";
import { getByTMDBId } from "../tmdb";
import { getFilmScore, getFilmScores } from "./film";
import { FilmScores } from "./score";
import { getSessionById } from "./session";
import { createLeagueSessionStudioObj } from "./zod";

type FilmWithTMDB = Awaited<ReturnType<typeof getByTMDBId>>;
type StudioFilm = Omit<
  Prisma.LeagueSessionStudioGetPayload<{
    include: { films: true };
  }>["films"][number],
  "tmdb"
> & {
  tmdb: FilmWithTMDB;
  scores: FilmScores;
  score: number;
};

const getMyStudio = protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    const studio = await ctx.prisma.leagueSessionStudio.findFirst({
      where: {
        sessionId: input.sessionId,
        ownerId: ctx.session.user.id,
      },
      include: {
        films: true,
      },
    });
    if (!studio) throw "No studio found";

    const session = await getSessionById(ctx, input.sessionId);

    if (studio && studio.films.length > 0)
      studio.films = await Promise.all(
        studio.films.map(async (film) => {
          const tmdb = await getByTMDBId(film.tmdbId);
          const scores = await getFilmScores({ ...film, tmdb });
          const score = await getFilmScore(ctx, session!, {
            ...film,
            tmdb,
            scores,
          });
          return {
            ...film,
            tmdb,
            scores,
            score,
          };
        }),
      );

    studio.score = studio.films.map((e) => e.score).reduce((a, b) => a + b, 0);
    await ctx.prisma.leagueSessionStudio.update({
      data: { score: studio.score },
      where: { id: studio.id },
    });

    return studio as LeagueSessionStudio & { films: StudioFilm[] };
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
        budget: 100,
        createdAt: new Date(),
      },
    });
  });

const getFavorites = protectedProcedure
  .input(z.object({ studioId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.prisma.studioFavorite.findMany({ where: input });
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

const getBids = protectedProcedure
  .input(z.object({ studioId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.prisma.filmBid.findMany({
      where: { studioId: input.studioId, status: BID_STATUSES.PENDING },
    });
  });

const bid = protectedProcedure
  .input(
    z.object({
      studioId: z.string(),
      tmdbId: z.number(),
      amount: z.number(),
      slot: z.number(),
      dropFilmId: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const data = {
      ...input,
      status: BID_STATUSES.PENDING,
      createdAt: new Date(),
    };
    return await ctx.prisma.filmBid.create({ data });
  });

const updateBid = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      studioId: z.string(),
      tmdbId: z.number(),
      amount: z.number(),
      dropFilmId: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const data = {
      ...input,
      status: BID_STATUSES.PENDING,
      createdAt: new Date(),
    };
    return await ctx.prisma.filmBid.update({ data, where: { id: input.id } });
  });

const deleteBid = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.filmBid.delete({ where: { id: input.id } });
  });

export const studioRouter = createTRPCRouter({
  getMyStudio,
  getOpposingStudios,
  create,
  getFavorites,
  addFavorite,
  removeFavorite,
  getBids,
  bid,
  updateBid,
  deleteBid,
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
    budget: 100,
    createdAt: new Date(),
  }));
  return await ctx.prisma.leagueSessionStudio.createMany({
    data,
  });
}
