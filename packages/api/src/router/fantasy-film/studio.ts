import { format } from "date-fns";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  TRPCContext,
} from "../../trpc";
import { createLeagueSessionStudioObj } from "./zod";

const create = protectedProcedure
  .input(createLeagueSessionStudioObj)
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findFirst({
      where: { id: input.ownerId },
    });
    const name = `${user?.name}'s Studio`;
    return await ctx.prisma.leagueSessionStudio.create({
      data: {
        sessionId: input.sessionId,
        ownerId: input.ownerId,
        name,
        createdAt: new Date(),
      },
    });
  });

export const studioRouter = createTRPCRouter({
  create,
});

////////////////

export async function createManyStudios(
  ctx: TRPCContext,
  input: z.infer<typeof createLeagueSessionStudioObj>[],
) {
  const users = await ctx.prisma.user.findMany({
    where: { id: { in: input.map((e) => e.ownerId) } },
  });
  const data = input.map((e) => ({
    ...createLeagueSessionStudioObj.parse(e),
    name: `${users.find((u) => u.id === e.ownerId)?.name}'s Studio`,
    createdAt: new Date(),
  }));
  return await ctx.prisma.leagueSessionStudio.createMany({
    data,
  });
}
