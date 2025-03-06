import { TRPCError } from "@trpc/server";
import { sub } from "date-fns";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { coinflip } from "../../utils";
import { TournamentInput, tournamentInputObject } from "./zod";

type TournamentEntry = {
  id: string;
  tournamentId: string;
  seed: number;
  name: string;
  description: string | null;
  image: string | null;
  totalVotes: number;
  votedFor: boolean;
  winner?: boolean;
};
type Matchup = {
  entry1: TournamentEntry;
  entry2: TournamentEntry;
};
type TournamentRound = {
  id: string;
  tournamentId: string;
  startDate: Date;
  endDate: Date;
  entries: TournamentEntry[];
  matchups?: Matchup[];
};

const get = publicProcedure.query(async ({ ctx }) => {
  const where = !ctx.session?.user.isAdmin ? { rounds: { some: { startDate: { lte: new Date() } } } } : {};

  const list = await ctx.prisma.tournament.findMany({
    include: { rounds: { orderBy: { startDate: "asc" } }, entries: { orderBy: { seed: "asc" } } },
    where,
  });

  return list
    .map((tournament, i) => {
      const startDate = tournament.rounds[0]?.startDate;
      const endDate = tournament.rounds[tournament.rounds.length - 1]?.endDate;

      return { ...tournament, startDate, endDate };
    })
    .sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0));
});

const getById = publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
  const tournament = await ctx.prisma.tournament.findFirst({
    include: {
      rounds: { orderBy: { startDate: "asc" } },
    },
    where: { id: input.id },
  });

  // if (!tournament) return new TRPCError({ message: "No tournament found", code: "NOT_FOUND" });
  if (!tournament) return undefined;

  const rounds: TournamentRound[] = [];
  const entries = await ctx.prisma.tournamentEntry.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { seed: "asc" },
    // include: { _count: { select: { votes: true } }, votes: { where: { userId: ctx.session?.user.id } } },
    include: { votes: true },
  });

  for (let i = 0; i < tournament.rounds.length; i++) {
    const round = tournament.rounds[i]!;
    const roundEntries = entries.map((e, j) => ({
      id: e.id,
      tournamentId: e.tournamentId,
      seed: e.seed,
      name: e.name,
      description: e.description,
      image: e.image,
      totalVotes: e.votes.filter((e) => e.round === i + 1).length,
      votedFor: !!e.votes.filter((e) => e.round === i + 1 && e.userId === ctx.session?.user.id).length,
    }));

    rounds.push({
      ...round,
      entries: orderEntries(roundEntries),
    });
  }

  getMatchups(rounds);

  const winner =
    rounds[rounds.length - 1]!.endDate <= new Date() ? findWinners(rounds[rounds.length - 1]!.matchups!)[0] : undefined;

  return { ...tournament, rounds, winner };
});

const create = adminProcedure.input(tournamentInputObject).mutation(async ({ ctx, input }) => {
  const tournament = await ctx.prisma.tournament.create({
    data: { name: input.name, description: input.description },
  });

  await saveTournamentRounds(ctx, input.rounds, tournament.id);

  return tournament;
});

const update = adminProcedure.input(tournamentInputObject).mutation(async ({ ctx, input }) => {
  const tournament = await ctx.prisma.tournament.update({
    data: { name: input.name, description: input.description },
    where: { id: input.id },
  });

  await saveTournamentRounds(ctx, input.rounds, tournament.id);

  return tournament;
});

const saveEntries = adminProcedure
  .input(
    z.array(
      z.object({
        id: z.string().optional(),
        tournamentId: z.string(),
        seed: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        image: z.string().optional(),
      }),
    ),
  )
  .mutation(async ({ ctx, input }) => {
    const entries = input.map((e, i) => ({ ...e, seed: i + 1 }));
    const entriesToCreate = entries.filter((e) => !e.id);
    const entriesToUpdate = entries.filter((e) => e.id);

    if (entriesToCreate.length) await ctx.prisma.tournamentEntry.createMany({ data: entriesToCreate });

    if (entriesToUpdate.length)
      for (const entry of entriesToUpdate)
        await ctx.prisma.tournamentEntry.update({ data: entry, where: { id: entry.id } });
  });

const vote = protectedProcedure
  .input(
    z.object({
      entryId: z.string(),
      round: z.number(),
      userId: z.string(),
      activeVote: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    if (input.activeVote)
      await ctx.prisma.tournamentVote.deleteMany({
        where: { userId: input.userId, entryId: input.activeVote, round: input.round },
      });

    return ctx.prisma.tournamentVote.create({
      data: { entryId: input.entryId, round: input.round, userId: input.userId, timestamp: new Date() },
    });
  });

export const tournamentRouter = createTRPCRouter({
  get,
  getById,
  create,
  update,
  saveEntries,
  vote,
});

//////////

async function saveTournamentRounds(ctx: TRPCContext, rounds: TournamentInput["rounds"], tournamentId: string) {
  rounds?.forEach((e) => {
    e.startDate.setUTCHours(20);
    e.endDate.setUTCHours(20);
  });

  const roundsToCreate = rounds?.filter((e) => !e.id);
  const roundsToUpdate = rounds?.filter((e) => e.id);

  if (roundsToCreate?.length)
    await ctx.prisma.tournamentRound.createMany({
      data: roundsToCreate.map((e) => ({ ...e, tournamentId })),
    });

  if (roundsToUpdate?.length)
    for (const round of roundsToUpdate)
      await ctx.prisma.tournamentRound.update({ data: round, where: { id: round.id } });
}

export function getMatchups(rounds: TournamentRound[]) {
  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    if (!round) return;

    const entries = round.entries;

    if (i > 0) {
      if (round.startDate > new Date()) return;

      const winners = new Set(findWinners(rounds[i - 1]!.matchups!).map((e) => e.id));
      round.matchups = getMatchupsFromEntries(entries.filter((e) => winners.has(e.id)));
    } else round.matchups = getMatchupsFromEntries(entries);
  }
}

function getMatchupsFromEntries(entries: TournamentEntry[]) {
  const matchups: Matchup[] = [];

  for (let i = 0; i < entries.length / 2; i++) matchups.push({ entry1: entries[i * 2]!, entry2: entries[i * 2 + 1]! });

  return matchups;
}

function findWinners(matchups: Matchup[]) {
  const winners: TournamentEntry[] = [];

  for (const matchup of matchups)
    if (matchup.entry1.totalVotes > matchup.entry2.totalVotes) {
      matchup.entry1.winner = true;
      winners.push(matchup.entry1);
    } else if (matchup.entry2.totalVotes > matchup.entry1.totalVotes) {
      matchup.entry2.winner = true;
      winners.push(matchup.entry2);
    } else {
      if (coinflip(matchup.entry1.name)) {
        matchup.entry1.winner = true;
        winners.push(matchup.entry1);
      } else {
        matchup.entry2.winner = true;
        winners.push(matchup.entry2);
      }
    }

  return winners;
}

export function orderEntries(entries: TournamentEntry[]) {
  const matchups: Matchup[] = [];

  const limit = Math.log2(entries.length) + 1;
  branch(1, 1, limit, entries, matchups);

  return matchups.map((e) => [e.entry1, e.entry2]).flat();
}

// https://stackoverflow.com/questions/37199059/generating-a-seeded-tournament-bracket
function branch(seed: number, level: number, limit: number, entries: TournamentEntry[], matchups: Matchup[]) {
  const levelSum = Math.pow(2, level) + 1;

  if (limit === level + 1) {
    const entry1 = entries[seed - 1];
    const entry2 = entries[levelSum - seed - 1];
    if (!!entry1 && !!entry2) matchups.push({ entry1, entry2 });
    return matchups;
  }

  if (seed % 2 === 1) {
    branch(seed, level + 1, limit, entries, matchups);
    branch(levelSum - seed, level + 1, limit, entries, matchups);
  } else {
    branch(levelSum - seed, level + 1, limit, entries, matchups);
    branch(seed, level + 1, limit, entries, matchups);
  }
}
