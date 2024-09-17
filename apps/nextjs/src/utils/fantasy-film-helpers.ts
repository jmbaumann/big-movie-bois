import { inferRouterOutputs } from "@trpc/server";
import { sub } from "date-fns";

import { AppRouter } from "@repo/api";
import { TMDBDiscoverResult } from "@repo/api/src/router/tmdb/types";
import { LeagueSessionSettingsDraft } from "@repo/api/src/zod";
import { StudioFilm } from "@repo/db";

type Film = TMDBDiscoverResult;
type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];
type StudioFilmDetails = StudioFilm & { tmdb: TMDBMovie };

export function getAvailableFilms(picks: StudioFilm[], films: Film[]) {
  const takenIds = picks.map((e) => e.tmdbId);
  return films.filter((e) => !takenIds.includes(e.id));
}

export function getMostRecentAndUpcoming(
  films: StudioFilmDetails[] | undefined,
) {
  let mostRecent: StudioFilmDetails | undefined;
  let upcoming: StudioFilmDetails | undefined;
  if (!films) return { mostRecent, upcoming };

  const now = new Date();

  const sortedFilms = films.sort(
    (a, b) =>
      new Date(a.tmdb.details.releaseDate).getTime() -
      new Date(b.tmdb.details.releaseDate).getTime(),
  );

  for (const film of sortedFilms) {
    const filmDate = new Date(film.tmdb.details.releaseDate);

    if (filmDate <= now) mostRecent = film;
    else if (!upcoming && filmDate > now) {
      upcoming = film;
      break;
    }
  }

  return { mostRecent, upcoming };
}

export function isSlotLocked(film: StudioFilmDetails | undefined) {
  if (!film) return false;
  return (
    sub(new Date(film.tmdb.details.releaseDate ?? ""), { days: 7 }).getTime() <
    new Date().getTime()
  );
}

export function getStudioOwnerByPick(draftOrder: string[], pick: number) {
  const round = Math.ceil(pick / draftOrder.length);
  const studioIndex = round * draftOrder.length - pick;
  const studio =
    round % 2 === 0
      ? draftOrder[studioIndex] ?? ""
      : [...draftOrder].reverse()[studioIndex];
  return studio ?? "";
}

export function getUpcomingPicks(
  numPicks: number,
  numRounds: number,
  draftOrder: string[],
) {
  const pickArray: { num: number; studio: string }[] = [];
  for (let i = 0; i < numRounds * draftOrder.length; i++)
    pickArray.push({
      num: i + 1,
      studio: getStudioOwnerByPick(draftOrder, i + 1) ?? "",
    });
  return pickArray.slice(numPicks);
}

export function getDraftDate(draftSettings: LeagueSessionSettingsDraft) {
  const draftDate = new Date(draftSettings.date ?? "");
  draftDate.setHours(
    draftSettings.ampm === "am"
      ? Number(draftSettings.hour!)
      : Number(draftSettings.hour!) !== 12
      ? Number(draftSettings.hour!) + 12
      : Number(draftSettings.hour!),
  );
  draftDate.setMinutes(Number(draftSettings.min!));
  return draftDate;
}
