import { format } from "date-fns";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  TRPCContext,
} from "../../trpc";
import { getSessionById } from "./session";

const getState = protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    const studios = await ctx.prisma.leagueSessionStudio.findMany({
      where: { sessionId: input.sessionId },
    });
    const picks = await ctx.prisma.studioFilm.findMany({
      where: { studioId: { in: studios.map((e) => e.id) } },
      orderBy: { acquiredAt: "asc" },
    });

    // const tmdbMovies =
    // for (const pick of picks) {
    // //   pick.details = movieList.find((e) => e.id === pick.tmdbId);

    const session = await getSessionById(ctx, input.sessionId);
    const activities = picks.map((pick) => {
      const studio = studios.find((e) => e.id === pick.studioId);
      const slot = session?.settings.teamStructure.find(
        (e) => e.pos === pick.slot,
      );
      return "action";
      // return `${studio?.name} drafted ${pick.details?.title}${
      //   slot ? " in their " + slotTypes[slot.type] + " slot" : ""
      // }`;
    });
    if (picks.length) activities.unshift("The draft has started!");
    return {
      started: picks.length > 0,
      currentPick: {
        num: picks.length + 1,
        startTimestamp: picks[picks.length - 1]?.acquiredAt!.getTime() ?? 0,
        endTimestamp:
          (picks[picks.length - 1]?.acquiredAt!.getTime() ?? 0) +
          (session?.settings.draft.timePerRound ?? 1) * 1000,
      },
      picks: picks.map((e) => ({
        ...e,
        // details: movieList.find((m) => m.id === e.tmdbId),
      })),
      activities,
    };
  });

const start = protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = await getSessionById(ctx, input.sessionId);
    if (!session) throw "No session found";

    const ts = new Date().getTime();
    const draftState = {
      currentPick: {
        num: 1,
        startTimestamp: ts,
        endTimestamp: ts + session.settings.draft.timePerRound * 1000,
      },
      lastPick: undefined,
      newActivities: ["The draft has started!"],
    };

    // await triggerSocket<typeof draftState>(
    //   `draft:${input.leagueUuid}:draft-update`,
    //   draftState,
    // );
    return input.sessionId;
  });

const pick = protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
      studioId: z.string(),
      tmdbId: z.number(),
      slot: z.number(),
      draftPick: z.number(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const film = await ctx.prisma.studioFilm.create({
      data: {
        tmdbId: input.tmdbId,
        studioId: input.studioId,
        slot: input.slot,
        acquiredAt: new Date(),
      },
    });

    const ts = new Date().getTime();

    const session = await getSessionById(ctx, input.sessionId);
    const sessionFilms = await ctx.prisma.studioFilm.findMany({
      where: { studio: { sessionId: { equals: input.sessionId } } },
    });
    const studio = await ctx.prisma.leagueSessionStudio.findFirst({
      where: { id: input.studioId },
    });
    const slot = session!.settings.teamStructure.find(
      (e) => e.pos === film.slot,
    );
    // film.details = movieList.find((e) => e.id === film.tmdbId);
    const draftState = {
      currentPick: {
        num: sessionFilms.length + 1,
        startTimestamp: ts,
        endTimestamp: ts + session!.settings.draft.timePerRound * 1000,
      },
      newActivities: [
        // `${studio?.name} drafted ${film.details?.title}${
        //   slot ? " in their " + slotTypes[slot.type] + " slot" : ""
        // }`,
        "film drafted",
      ],
      lastPick: film,
    };

    // await triggerSocket<typeof draftState>(
    //   `draft:${input.leagueUuid}:draft-update`,
    //   draftState,
    // );
    return input.sessionId;
  });

export const draftRouter = createTRPCRouter({
  getState,
  start,
  pick,
});

////////////////
