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
import { createManyStudios } from "./studio";
import {
  createLeagueSessionInputObj,
  LeagueSessionSettings,
  updateLeagueSessionInputObj,
} from "./zod";

type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];
type StudioFilmDetails = StudioFilm & { tmdb: TMDBMovie };

const getById = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    return await getSessionById(ctx, input.id);
  });

const create = protectedProcedure
  .input(createLeagueSessionInputObj)
  .mutation(async ({ ctx, input }) => {
    if (!input.leagueId) throw "No League ID provided";

    const data = {
      leagueId: input.leagueId,
      slug: `${format(input.startDate, "yyyy-MM-dd")}-${format(
        input.endDate,
        "yyyy-MM-dd",
      )}`,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      settings: JSON.stringify(input.settings),
    };

    const session = await ctx.prisma.leagueSession.create({ data });

    if (input.memberIds?.length) {
      const studios = input.memberIds.map((e) => ({
        sessionId: session.id,
        ownerId: e,
      }));
      await createManyStudios(ctx, studios);
    }

    return session;
  });

const update = protectedProcedure
  .input(updateLeagueSessionInputObj)
  .mutation(async ({ ctx, input }) => {
    const data = {
      leagueId: input.leagueId,
      slug: `${format(input.startDate, "yyyy-MM-dd")}-${format(
        input.endDate,
        "yyyy-MM-dd",
      )}`,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      settings: JSON.stringify(input.settings),
    };

    const session = await ctx.prisma.leagueSession.update({
      data,
      where: { id: input.id },
    });
    return session;
  });

const getAcquiredFilms = protectedProcedure
  .input(
    z.object({ sessionId: z.string(), includeDetails: z.boolean().optional() }),
  )
  .query(async ({ ctx, input }) => {
    const list = await ctx.prisma.studioFilm.findMany({
      where: { studio: { sessionId: { equals: input.sessionId } } },
    });
    if (!input.includeDetails) return list;

    for (const film of list as StudioFilmDetails[])
      film.tmdb = await getByTMDBId(film.tmdbId);

    return list;
  });

export const leagueSessionRouter = createTRPCRouter({
  getById,
  create,
  update,
  getAcquiredFilms,
});

////////////////

export async function getSessionById(ctx: TRPCContext, id: string) {
  const session = await ctx.prisma.leagueSession.findFirst({
    where: { id },
    include: { studios: true, league: { select: { ownerId: true } } },
  });
  if (!session) return null;
  return {
    ...session,
    settings: JSON.parse(session.settings as string) as LeagueSessionSettings,
  };
}
