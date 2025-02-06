import { sub } from "date-fns";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { TournamentInput, tournamentInputObject } from "./zod";

const get = publicProcedure.query(async ({ ctx }) => {
  return ctx.prisma.tournament.findMany({ include: { rounds: true, entries: true } });
});

const create = adminProcedure.input(tournamentInputObject).mutation(async ({ ctx, input }) => {
  const tournament = await ctx.prisma.tournament.create({
    data: { name: input.name, description: input.description },
  });

  await updateTournamentRounds(ctx, input.rounds, tournament.id);

  return tournament;
});

const update = adminProcedure.input(tournamentInputObject).mutation(async ({ ctx, input }) => {
  const tournament = await ctx.prisma.tournament.update({
    data: { name: input.name, description: input.description },
    where: { id: input.id },
  });

  await updateTournamentRounds(ctx, input.rounds, tournament.id);

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

export const tournamentRouter = createTRPCRouter({
  get,
  create,
  update,
  saveEntries,
});

//////////

async function updateTournamentRounds(ctx: TRPCContext, rounds: TournamentInput["rounds"], tournamentId: string) {
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
