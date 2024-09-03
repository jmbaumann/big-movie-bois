import {
  TMDBCreditsResponse,
  TMDBDetailsResponse,
  TMDBKeywordsResponse,
  TMDBReleaseDatesResponse,
} from "./types";

export async function getDetailsById(
  id: number,
): Promise<TMDBDetailsResponse | undefined> {
  return await tmdb(`https://api.themoviedb.org/3/movie/${id}?language=en-US`);
}

export async function getCreditsById(
  id: number,
): Promise<TMDBCreditsResponse | undefined> {
  return await tmdb(
    `https://api.themoviedb.org/3/movie/${id}/credits?language=en-US`,
  );
}

export async function getReleaseDatesById(
  id: number,
): Promise<TMDBReleaseDatesResponse | undefined> {
  return await tmdb(`https://api.themoviedb.org/3/movie/${id}/release_dates`);
}

export async function getKeywordsById(
  id: number,
): Promise<TMDBKeywordsResponse | undefined> {
  return await tmdb(`https://api.themoviedb.org/3/movie/${id}/keywords`);
}

export async function tmdb<T>(url: string, method?: "GET" | "POST") {
  const options = {
    method: method ?? "GET",
    headers: getTMDBHeaders(),
  };

  try {
    const res = await fetch(url, options);
    const data: T = await res.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

export function getTMDBHeaders() {
  return {
    accept: "application/json",
    Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
  };
}
