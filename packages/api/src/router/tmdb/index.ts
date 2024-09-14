import { format } from "date-fns";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import {
  tmdbCertifications,
  tmdbCredits,
  tmdbDetails,
  tmdbKeywords,
} from "../daily-games/overlap/movieDataLL";
import {
  getByDateRange,
  getCreditsById,
  getDetailsById,
  getKeywordsById,
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

const search = publicProcedure
  .input(z.object({ keyword: z.string() }))
  .query(async ({ ctx, input }) => {
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
      return data.results
        .filter((e) => e.popularity >= POPULARITY_THRESHOLD)
        .map((e) => ({ id: e.id, title: e.title }));
    } catch (error) {
      console.error(error);
    }
  });

const getById = publicProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    return getByTMDBId(input.id);
  });

const getFilmsForSession = publicProcedure
  .input(z.object({ sessionId: z.string(), today: z.boolean().optional() }))
  .query(async ({ ctx, input }) => {
    const session = await ctx.prisma.leagueSession.findFirst({
      where: { id: input.sessionId },
    });
    if (!session) throw "No session found";

    const fromDate = input.today
      ? format(new Date(), "yyyy-MM-dd")
      : format(session.startDate, "yyyy-MM-dd");

    return getByDateRange(fromDate, format(session.endDate, "yyyy-MM-dd"));
  });

export const tmdbRouter = createTRPCRouter({
  search,
  getById,
  getFilmsForSession,
});

export async function getByTMDBId(id: number) {
  const details = await getDetailsById(id);
  const credits = await getCreditsById(id);
  const releases = await getReleaseDatesById(id);
  const keywords = await getKeywordsById(id);

  if (!details || !credits || !releases || !keywords) throw "Bad TMDB call";

  return restructure({ details, credits, releases, keywords });
}

function restructure(movie: {
  details: TMDBDetailsResponse;
  credits: TMDBCreditsResponse;
  releases: TMDBReleaseDatesResponse;
  keywords: TMDBKeywordsResponse;
}) {
  const details = {
    id: movie.details.id,
    title: movie.details.title,
    releaseDate: movie.details.release_date,
    releaseYear: format(movie.details.release_date, "yyyy"),
    genres: movie.details.genres.map((e) => e.name),
    runtime: movie.details.runtime,
    rating: movie.releases.results
      .find((e) => e.iso_3166_1 === "US")
      ?.release_dates.find((e) => e.type === 3)?.certification,
    budget: movie.details.budget,
    revenue: movie.details.revenue,
    keywords: movie.keywords.keywords.map((e) => e.name).slice(0, 12),
    poster: `https://image.tmdb.org/t/p/w1280/${movie.details.poster_path}`,
  };
  const cast = movie.credits.cast.map((e) => ({
    name: e.name,
    image: `https://media.themoviedb.org/t/p/w600_and_h900_bestv2/${e.profile_path}`,
  }));
  const crew = movie.credits.crew.map((e) => ({
    name: e.name,
    department: e.department,
    job: e.job,
    image: `https://media.themoviedb.org/t/p/w600_and_h900_bestv2/${e.profile_path}`,
  }));

  return { details, cast, crew };
}
