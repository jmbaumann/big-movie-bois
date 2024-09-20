import { add, format, nextTuesday } from "date-fns";
import { z } from "zod";

import { createTRPCRouter, publicProcedure, TRPCContext } from "../../trpc";
import { tmdbCertifications, tmdbCredits, tmdbDetails, tmdbKeywords } from "../daily-games/overlap/movieDataLL";
import {
  getByDateRange,
  getCreditsById,
  getDetailsById,
  getKeywordsById,
  getMovieFromTMDB,
  getReleaseDatesById,
  tmdb,
} from "./tmdb";
import {
  TMDBCreditsResponse,
  TMDBDetailsResponse,
  TMDBKeywordsResponse,
  TMDBReleaseDatesResponse,
  TMDBSearchResponse,
} from "./types";

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

export const tmdbRouter = createTRPCRouter({
  search,
  getById,
  getFilmsForSession,
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
