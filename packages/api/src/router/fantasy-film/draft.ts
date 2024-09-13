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

// start: protectedProcedure
//   .input(
//     z.object({
//       leagueUuid: z.string().uuid(),
//     }),
//   )
//   .mutation(async ({ ctx, input }) => {
//     const league = await getLeagueByUuid(ctx, input.leagueUuid);
//     const ts = new Date().getTime();
//     const draftState = {
//       currentPick: {
//         num: 1,
//         startTimestamp: ts,
//         endTimestamp: ts + (league?.settings.draft.roundTime ?? 0) * 1000,
//       },
//       lastPick: undefined,
//       newActivities: ["The draft has started!"],
//     };

//     await triggerSocket<typeof draftState>(
//       `draft:${input.leagueUuid}:draft-update`,
//       draftState,
//     );
//     return input.leagueUuid;
//   }),

// pick: protectedProcedure
//   .input(
//     z.object({
//       leagueUuid: z.string().uuid(),
//       tmdbId: z.number(),
//       studioId: z.string(),
//       pos: z.number(),
//       draftPick: z.number(),
//     }),
//   )
//   .mutation(async ({ ctx, input }) => {
//     const movie: Movie = await ctx.prisma.movie.create({
//       data: {
//         tmdbId: input.tmdbId,
//         studioId: input.studioId,
//         pos: input.pos,
//         draftPick: input.draftPick,
//         timestamp: new Date(),
//       },
//     });

//     const ts = new Date().getTime();
//     const league = (await ctx.prisma.leagueYear.findFirst({
//       where: { studios: { some: { id: movie.studioId } } },
//       include: { studios: true },
//     })) as LeagueYear;
//     const studio = league?.studios.find((e) => e.id === movie.studioId);
//     const slot = league?.settings.teamStructure.find(
//       (e) => e.pos === movie.pos,
//     );
//     movie.details = movieList.find((e) => e.id === movie.tmdbId);
//     const draftState = {
//       currentPick: {
//         num: movie.draftPick + 1,
//         startTimestamp: ts,
//         endTimestamp: ts + league.settings.draft.roundTime * 1000,
//       },
//       newActivities: [
//         `${studio?.name} drafted ${movie.details?.title}${
//           slot ? " in their " + slotTypes[slot.type] + " slot" : ""
//         }`,
//       ],
//       lastPick: movie,
//     };

//     await triggerSocket<typeof draftState>(
//       `draft:${input.leagueUuid}:draft-update`,
//       draftState,
//     );
//     return input.leagueUuid;
//   })

export const draftRouter = createTRPCRouter({
  getState,
});

////////////////
