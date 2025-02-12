import { RouterOutputs } from "./api";

type TournamentEntry = NonNullable<RouterOutputs["tournament"]["getById"]>["rounds"][number]["entries"][number];
type Matchup = {
  entry1: TournamentEntry;
  entry2: TournamentEntry;
};

export function getMatchups(entries: TournamentEntry[], round: number) {
  const seededEntries = orderEntries(entries);
  const matchups: Matchup[] = [];

  for (let i = 0; i < entries.length / 2; i++)
    matchups.push({ entry1: seededEntries[i * 2]!, entry2: seededEntries[i * 2 + 1]! });

  return matchups;
}

export function getNextMatchup(matchups?: Matchup[]) {
  if (!matchups) return undefined;

  for (const matchup of matchups) if (!matchup.entry1.votedFor && !matchup.entry2.votedFor) return matchup;

  return undefined;
}

export function orderEntries(entries: TournamentEntry[]) {
  const ordered: TournamentEntry[] = [];

  for (let i = 0; i < entries.length / 2; i++) {
    ordered.push(entries[i]!);
    ordered.push(entries[entries.length - (i + 1)]!);
  }

  return ordered;
}
