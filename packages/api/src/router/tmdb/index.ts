import { add, format, nextTuesday, sub } from "date-fns";
import e from "express";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, TRPCContext } from "../../trpc";
import { getByDateRange, getMovieFromTMDB } from "./tmdb";
import { TMDBSearchResponse } from "./types";

const POPULARITY_THRESHOLD = 10;

const search = publicProcedure.input(z.object({ keyword: z.string() })).query(async ({ ctx, input }) => {
  const url = `https://api.themoviedb.org/3/search/movie?query=${input.keyword}&include_adult=false&language=en-US&page=1`;
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    },
  };

  try {
    const res = await fetch(url, options);
    const data: TMDBSearchResponse = await res.json();
    // TODO: handle duplicate titles
    return data.results.filter((e) => e.popularity >= POPULARITY_THRESHOLD).map((e) => ({ id: e.id, title: e.title }));
  } catch (error) {
    console.error(error);
  }
});

const getById = publicProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
  return getByTMDBId(ctx, input.id);
});

const getFilmsForSession = publicProcedure
  .input(z.object({ sessionId: z.string(), page: z.number(), today: z.boolean().optional() }))
  .query(async ({ ctx, input }) => {
    return await getFilmsBySessionId(ctx, input.sessionId, input.page, input.today);
  });

const getActive = publicProcedure.input(z.object({})).query(
  async ({ ctx, input }) =>
    await ctx.prisma.tMDBDetails.findMany({
      include: { cast: true, crew: true },
      where: {
        studioFilms: {
          some: {
            studio: {
              session: {
                AND: [
                  {
                    startDate: {
                      lte: new Date(),
                    },
                  },
                  {
                    endDate: {
                      gte: new Date(),
                    },
                  },
                ],
              },
            },
          },
        },
      },
      orderBy: { releaseDate: "asc" },
    }),
);

const updateFantasyFilms = publicProcedure.mutation(async ({ ctx, input }) => {});

export const tmdbRouter = createTRPCRouter({
  search,
  getById,
  getFilmsForSession,
  getActive,
  updateFantasyFilms,
});

////////////////

export async function getByTMDBId(ctx: TRPCContext, id: number) {
  const film = await ctx.prisma.tMDBDetails.findFirst({ include: { cast: true, crew: true }, where: { id } });
  if (film) return film;

  const tmdb = await getMovieFromTMDB(id);
  await ctx.prisma.tMDBDetails.create({ data: tmdb.details });
  await ctx.prisma.tMDBCast.createMany({ data: tmdb.cast });
  await ctx.prisma.tMDBCrew.createMany({ data: tmdb.crew });

  return await ctx.prisma.tMDBDetails.findFirst({ include: { cast: true, crew: true }, where: { id } });
}

export async function getFilmsBySessionId(ctx: TRPCContext, sessionId: string, page: number, today?: boolean) {
  const session = await ctx.prisma.leagueSession.findFirst({
    where: { id: sessionId },
  });
  if (!session) throw "No session found";

  const fromDate = today
    ? format(add(nextTuesday(new Date()), { days: 8 }), "yyyy-MM-dd")
    : format(session.startDate, "yyyy-MM-dd");

  return getByDateRange(fromDate, format(session.endDate, "yyyy-MM-dd"), page);
}

async function updateMasterFantasyFilmList(ctx: TRPCContext) {
  // get top 260 films from tmdb (from -365 days - +400 days)
  const from = format(sub(new Date(), { days: 370 }), "yyyy-MM-dd");
  const to = format(add(new Date(), { days: 400 }), "yyyy-MM-dd");

  const chunks = await Promise.all(Array.from({ length: 13 }).map((_, i) => getByDateRange(from, to, i + 1)));
  const films = chunks
    .filter((e) => e !== undefined)
    .map((e) => e!.results)
    .flat();

  const inDb = await ctx.prisma.tMDBDetails.findMany({
    select: { id: true },
    where: { id: { in: films.map((e) => e?.id) } },
  });
  const inDbIds = new Set(inDb.map((e) => e.id));
  const toCreate = films.filter((e) => !inDbIds.has(e.id));
  const toUpdate = films
    .filter((e) => inDbIds.has(e.id))
    .map((e) => ({
      id: e.id,
      title: e.title,
      overview: e.overview,
      poster: e.poster_path,
      releaseDate: e.release_date,
      popularity: e.popularity,
      rating: e.vote_count,
    }));

  // update existing
  for (const update of toUpdate) await ctx.prisma.tMDBDetails.update({ data: update, where: { id: update.id } });

  // create new entries
  for (const create of toCreate) await getByTMDBId(ctx, create.id);
}
