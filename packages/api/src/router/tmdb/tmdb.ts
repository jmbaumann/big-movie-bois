import { TRPCError } from "@trpc/server";
import { format, parseISO } from "date-fns";

import {
  TMDBCreditsResponse,
  TMDBDetailsResponse,
  TMDBDiscoverResponse,
  TMDBKeywordsResponse,
  TMDBMovieSearchResponse,
  TMDBPersonSearchResponse,
  TMDBReleaseDatesResponse,
} from "./types";

const POPULARITY_THRESHOLD = 10;
const POPULARITY_VOTE_THRESHOLD = 1000;

export async function searchMovie(keyword: string) {
  const url = `https://api.themoviedb.org/3/search/movie?query=${keyword}&include_adult=false&language=en-US&with_release_type=3&sort_by=popularity.desc&page=1`;

  try {
    const data = await tmdb<TMDBMovieSearchResponse>(url);
    if (!data) throw new TRPCError({ message: "No results", code: "NOT_FOUND" });

    let list = data.results
      .filter((e) => e.popularity >= POPULARITY_THRESHOLD || e.popularity * e.vote_count >= POPULARITY_VOTE_THRESHOLD)
      .sort((a, b) =>
        b.popularity >= POPULARITY_THRESHOLD || a.popularity >= POPULARITY_THRESHOLD
          ? b.popularity - a.popularity
          : b.popularity * b.vote_count - a.popularity * a.vote_count,
      )
      .map((e) => ({
        id: e.id,
        title: e.title,
        year: e.release_date ? format(e.release_date, "yyyy") : "",
        poster: e.poster_path,
      }));

    const titleCount: Record<string, number> = {};
    list.forEach((movie) => {
      titleCount[movie.title] = (titleCount[movie.title] || 0) + 1;
    });

    const movies = list.map((movie) => {
      if ((titleCount[movie.title] ?? 0) > 1) return { ...movie, title: `${movie.title} (${movie.year})` };
      return movie;
    });

    return movies;
  } catch (error) {
    console.error(error);
  }
}

export async function getMovieFromTMDB(id: number, simple?: boolean) {
  try {
    const details = await getDetailsById(id);
    const credits = simple ? undefined : await getCreditsById(id);
    const releases = await getReleaseDatesById(id);
    const keywords = simple ? undefined : await getKeywordsById(id);

    if (!details || !releases || (simple ? false : !credits || !keywords)) throw "Bad TMDB call";

    return restructure({ details, credits, releases, keywords });
  } catch (e) {
    console.log("failed getMovieFromTMDB", e);
  }
}

export async function getDetailsById(id: number): Promise<TMDBDetailsResponse | undefined> {
  return await tmdb(`https://api.themoviedb.org/3/movie/${id}?language=en-US`);
}

export async function getCreditsById(id: number): Promise<TMDBCreditsResponse | undefined> {
  return await tmdb(`https://api.themoviedb.org/3/movie/${id}/credits?language=en-US`);
}

export async function getReleaseDatesById(id: number): Promise<TMDBReleaseDatesResponse | undefined> {
  return await tmdb(`https://api.themoviedb.org/3/movie/${id}/release_dates`);
}

export async function getKeywordsById(id: number): Promise<TMDBKeywordsResponse | undefined> {
  return await tmdb(`https://api.themoviedb.org/3/movie/${id}/keywords`);
}

export async function getByDateRange(
  fromDate: string,
  toDate: string,
  page: number,
): Promise<TMDBDiscoverResponse | undefined> {
  return await tmdb(
    `https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&region=US&page=${page}&primary_release_date.gte=${fromDate}&primary_release_date.lte=${toDate}&release_date.gte=${fromDate}&release_date.lte=${toDate}&sort_by=popularity.desc&with_release_type=3`,
  );
}

export async function searchPerson(keyword: string) {
  const query = encodeURI(keyword);
  const url = `https://api.themoviedb.org/3/search/person?query=${query}&include_adult=false&language=en-US&page=1`; // "mikey%20madison"

  try {
    const data = await tmdb<TMDBPersonSearchResponse>(url);
    if (!data) throw new TRPCError({ message: "No results", code: "NOT_FOUND" });

    return data.results.sort((a, b) => b.popularity - a.popularity).filter((e) => e.popularity > 1);
  } catch (error) {
    console.error(error);
  }
}

//////////

export async function tmdb<T>(url: string, method?: "GET" | "POST") {
  const options = {
    method: method ?? "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    },
  };

  try {
    const res = await fetch(url, options);
    const data: T = await res.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

function restructure(movie: {
  details: TMDBDetailsResponse;
  credits?: TMDBCreditsResponse;
  releases: TMDBReleaseDatesResponse;
  keywords?: TMDBKeywordsResponse;
}) {
  const crewDict = {
    Directing: new Set(["Director"]),
    Editing: new Set(["Editor"]),
    Production: new Set(["Executive Producer", "Producer"]),
    Sound: new Set(["Original Music Composer"]),
    Writing: new Set(["Writer", "Screenplay"]),
    Camera: new Set(["Director of Photography"]),
  };

  const details = {
    id: movie.details.id,
    imdbId: movie.details.imdb_id,
    title: movie.details.title,
    overview: movie.details.overview,
    poster: movie.details.poster_path,
    // poster: `https://image.tmdb.org/t/p/w1280/${movie.details.poster_path}`,
    releaseDate: getReleaseDate(
      movie.releases.results.find((e) => e.iso_3166_1 === "US")?.release_dates.find((e) => e.type === 3)
        ?.release_date ?? movie.details.release_date,
    ),
    runtime: movie.details.runtime,
    certification: movie.releases.results.find((e) => e.iso_3166_1 === "US")?.release_dates.find((e) => e.type === 3)
      ?.certification,
    budget: movie.details.budget,
    revenue: movie.details.revenue,
    openingWeekend: 0,
    popularity: movie.details.popularity,
    rating: movie.details.vote_average,
    tagline: movie.details.tagline,
    genres: movie.details.genres.map((e) => e.name),
    keywords: movie.keywords?.keywords.map((e) => e.name).slice(0, 12),
  };
  const cast = movie.credits?.cast.slice(0, 20).map((e) => ({
    tmdbId: movie.details.id,
    name: e.name,
    image: e.profile_path,
    // image: `https://media.themoviedb.org/t/p/w600_and_h900_bestv2/${e.profile_path}`,
  }));
  const crew = movie.credits?.crew
    .filter((e) => crewDict[e.department as keyof typeof crewDict]?.has(e.job))
    .map((e) => ({
      tmdbId: movie.details.id,
      name: e.name,
      department: e.department,
      job: e.job,
      image: e.profile_path,
      // image: `https://media.themoviedb.org/t/p/w600_and_h900_bestv2/${e.profile_path}`,
    }));

  return { details, cast, crew };
}

function getReleaseDate(date: string) {
  const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
  return match![1] ?? "";
}
