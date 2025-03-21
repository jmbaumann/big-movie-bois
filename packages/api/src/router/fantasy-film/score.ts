import { Prisma } from "@repo/db";

type FilmWithTMDB = Prisma.StudioFilmGetPayload<{
  include: { tmdb: true };
}>;

export type FilmScores = {
  totalBoxOffice: number;
  openingWeekendBoxOffice: number;
  rating: number;
  reverseRating: number;
};

export function getTotalBoxOfficeScore(film: FilmWithTMDB) {
  return Math.round(Number(film.tmdb.revenue) / 1000000) / 10;
}

export function getOpeningWeekendBoxOfficeScore(film: FilmWithTMDB) {
  return Math.round(film.tmdb.openingWeekend / 100000) / 10;
}

export function getRatingScore(film: FilmWithTMDB) {
  return Math.round(film.tmdb.rating * 100) / 10;
}

export function getReverseRatingScore(film: FilmWithTMDB) {
  return Math.round((10 - film.tmdb.rating) * 100) / 10;
}
