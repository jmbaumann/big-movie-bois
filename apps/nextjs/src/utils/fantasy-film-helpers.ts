import { LeagueSessionSettingsDraft } from "@repo/api/src/zod";

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
