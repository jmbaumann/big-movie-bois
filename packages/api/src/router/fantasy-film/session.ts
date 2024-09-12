import { format } from "date-fns";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";
import { createManyStudios } from "./studio";
import { createLeagueSessionInputObj, LeagueSessionSettings } from "./zod";

const getById = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const session = await ctx.prisma.leagueSession.findFirst({
      where: { id: input.id },
    });
    if (!session) return null;
    return {
      ...session,
      settings: JSON.parse(session.settings as string) as LeagueSessionSettings,
    };
  });

const create = protectedProcedure
  .input(createLeagueSessionInputObj)
  .mutation(async ({ ctx, input }) => {
    if (!input.leagueId) throw "No League ID provided";

    const data = {
      leagueId: input.leagueId,
      slug: `${format(input.startDate, "yyyy-MM-dd")}-${format(
        input.endDate,
        "yyyy-MM-dd",
      )}`,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      settings: JSON.stringify(input.settings),
    };

    const session = await ctx.prisma.leagueSession.create({ data });

    if (input.memberIds?.length) {
      const studios = input.memberIds.map((e) => ({
        sessionId: session.id,
        ownerId: e,
      }));
      await createManyStudios(ctx, studios);
    }

    return session;
  });

const getMyStudio = protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.prisma.leagueSessionStudio.findFirst({
      where: { sessionId: input.sessionId, ownerId: ctx.session.user.id },
      include: { films: true },
    });
  });

const getOpposingStudios = protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.prisma.leagueSessionStudio.findMany({
      where: {
        sessionId: input.sessionId,
        ownerId: { notIn: [ctx.session.user.id] },
      },
    });
  });

export const leagueSessionRouter = createTRPCRouter({
  getById,
  create,
  getMyStudio,
  getOpposingStudios,
});

////////////////
