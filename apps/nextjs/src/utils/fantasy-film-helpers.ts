import { LeagueSessionSettingsDraft } from "@repo/api/src/zod";
import { StudioFilm } from "@repo/db";

export function getAvailableFilms(picks: StudioFilm[], films: any[]) {
  const takenIds = picks.map((e) => e.tmdbId);
  return films.filter((e) => !takenIds.includes(e.id));
}

export function getStudioByPick(draftOrder: string[], pick: number) {
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
  teamSlots: number,
  draftOrder: string[],
) {
  const pickArray: { num: number; studio: string }[] = [];
  for (let i = 0; i < teamSlots * draftOrder.length; i++)
    pickArray.push({
      num: i + 1,
      studio: getStudioByPick(draftOrder, i + 1) ?? "",
    });
  return pickArray.slice(numPicks);
}

export function getDraftDate(draftSettings: LeagueSessionSettingsDraft) {
  const draftDate = new Date(draftSettings.date ?? "");
  draftDate.setHours(
    draftSettings.ampm === "am"
      ? Number(draftSettings.hour!)
      : Number(draftSettings.hour!) + 12,
  );
  draftDate.setMinutes(Number(draftSettings.min!));
  return draftDate;
}
