import { differenceInCalendarDays, sub } from "date-fns";

import { RouterOutputs } from "@repo/api";
import { TMDBDiscoverResult } from "@repo/api/src/router/tmdb/types";
import { LeagueSessionSettingsDraft } from "@repo/api/src/zod";
import { StudioFilm, TMDBDetails } from "@repo/db";

type Film = TMDBDiscoverResult;
type Session = RouterOutputs["ffLeagueSession"]["getById"];
type Studios = RouterOutputs["ffStudio"]["getStudios"];
type Studio = Studios[number] | RouterOutputs["ffStudio"]["getMyStudio"];
type StudioFilmTMDB = Studios[number]["films"][number] | (StudioFilm & { tmdb: TMDBDetails });

export function isSessionStarted(session: Session | undefined) {
  if (!session) return false;
  return differenceInCalendarDays(new Date(), session.startDate) > 0;
}

export function isSessionEnded(session: Session | undefined) {
  if (!session) return false;
  return differenceInCalendarDays(new Date(), session.endDate) > 0;
}

export function getAvailableFilms(picks: StudioFilm[], films: TMDBDetails[]) {
  const takenIds = picks.map((e) => e.tmdbId);
  return films.filter((e) => !takenIds.includes(e.id));
}

export function getMostRecentAndUpcoming(films: StudioFilmTMDB[] | undefined) {
  let mostRecent: StudioFilmTMDB | undefined;
  let upcoming: StudioFilmTMDB | undefined;
  if (!films) return { mostRecent, upcoming };

  const now = new Date();

  const sortedFilms = films.sort(
    (a, b) => new Date(a?.tmdb?.releaseDate ?? "").getTime() - new Date(b?.tmdb?.releaseDate ?? "").getTime(),
  );

  for (const film of sortedFilms) {
    const filmDate = new Date(film?.tmdb?.releaseDate ?? "");

    if (filmDate <= now) mostRecent = film;
    else if (!upcoming && filmDate > now) {
      upcoming = film;
      break;
    }
  }

  return { mostRecent, upcoming };
}

export function isSlotLocked(film: StudioFilmTMDB | undefined) {
  if (!film) return false;
  return sub(new Date(film?.tmdb?.releaseDate ?? ""), { days: 7 }).getTime() < new Date().getTime();
}

export function getFilmsReleased(films: StudioFilmTMDB[]) {
  let total = 0;
  for (const film of films) if (isSlotLocked(film)) total++;
  return total;
}

export function getUnlockedSlots(session: Session, studio: Studio) {
  const dict = {} as Record<number, boolean>;
  for (const film of studio.films) dict[film.slot] = isSlotLocked(film);

  const slots = session?.settings.teamStructure.filter((e) => !dict[e.pos]);
  return slots;
}

export function getFilmCost(maxPopularity: number, filmPopularity: number) {
  return Math.min(Math.round((filmPopularity / maxPopularity) * 40), 40);
}

export function getStudioOwnerByPick(draftOrder: string[], pick: number) {
  const round = Math.ceil(pick / draftOrder.length);
  const studioIndex = round * draftOrder.length - pick;
  const studio = round % 2 === 0 ? draftOrder[studioIndex] ?? "" : [...draftOrder].reverse()[studioIndex];
  return studio ?? "";
}

export function getUpcomingPicks(numPicks: number, numRounds: number, draftOrder: string[]) {
  const pickArray: { num: number; studio: string }[] = [];
  for (let i = 0; i < numRounds * draftOrder.length; i++)
    pickArray.push({
      num: i + 1,
      studio: getStudioOwnerByPick(draftOrder, i + 1) ?? "",
    });
  return pickArray.slice(numPicks);
}

export function getDraftDate(draftSettings: LeagueSessionSettingsDraft) {
  if (!draftSettings.date) return undefined;

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
