import { StudioFilm } from "@repo/db";

import { getByTMDBId } from "../tmdb";

type TMDBDetails = typeof getByTMDBId;
type FilmWithTMDB = StudioFilm & { tmdb: Awaited<ReturnType<TMDBDetails>> };

export type FilmScores = {
  totalBoxOffice: number;
  openingWeekendBoxOffice: number;
  rating: number;
  reverseRating: number;
};

export function getTotalBoxOfficeScore(film: FilmWithTMDB) {
  return Math.round(film.tmdb.details.revenue / 1000000) / 10;
}

export function getOpeningWeekendBoxOfficeScore(film: FilmWithTMDB) {
  return Math.round(film.tmdb.details.revenue / 100000) / 10;
}

export function getRatingScore(film: FilmWithTMDB) {
  return Math.round(film.tmdb.details.score * 100) / 10;
}

export function getReverseRatingScore(film: FilmWithTMDB) {
  return Math.round((10 - film.tmdb.details.score) * 100) / 10;
}
