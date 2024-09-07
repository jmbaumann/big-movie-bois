import { format } from "date-fns";
import { z } from "zod";

import { Prisma } from "@repo/db";
import type { League, Session, Studio } from "@repo/db";

import { DRAFT_TYPES, STUDIO_SLOT_TYPES } from "../../enums";
// import { movieList } from "../movies";
import type { TRPCContext } from "../../trpc";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";
import { createLeagueSessionInputObj } from "./zod";

const getById = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const session = await ctx.prisma.leagueSession.findFirst({
      where: { id: input.id },
    });
    if (!session) return null;
    return session;
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
    // TODO: add studios
    return session;
  });

export const leagueSessionRouter = createTRPCRouter({
  getById,
  create,
});

////////////////
