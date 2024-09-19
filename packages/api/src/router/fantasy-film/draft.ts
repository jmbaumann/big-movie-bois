import { format } from "date-fns";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { draftEvent } from "../../wss";
import { getFilmsBySessionId } from "../tmdb";
import { getSessionById } from "./session";
import { makePickObj } from "./zod";

const getState = protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
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
    const slot = session?.settings.teamStructure.find((e) => e.pos === pick.slot);
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
        (picks[picks.length - 1]?.acquiredAt!.getTime() ?? 0) + (session?.settings.draft.timePerRound ?? 1) * 1000,
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

    const studio = session.studios.find((e) => e.ownerId === session.settings.draft.order[0]);
    if (!studio) throw "No draft order";

    const ts = new Date().getTime();
    const draftState = {
      sessionId: input.sessionId,
      currentPick: {
        studioId: studio.id,
        num: 1,
        startTimestamp: ts,
        endTimestamp: ts + session.settings.draft.timePerRound * 1000,
      },
      lastPick: undefined,
      newActivities: ["The draft has started!"],
    };

    draftEvent<typeof draftState>(`draft:${input.sessionId}:draft-update`, draftState);
    return input.sessionId;
  });

const pick = protectedProcedure.input(makePickObj).mutation(async ({ ctx, input }) => {
  return await makePick(ctx, input);
});

const auto = publicProcedure
  .meta({ openapi: { method: "POST", path: "/auto-draft" } })
  .input(z.object({ sessionId: z.string(), studioId: z.string(), pick: z.number() }))
  .output(z.void())
  .mutation(async ({ ctx, input }) => {
    return await autoDraft(ctx, input.sessionId, input.studioId, input.pick);
  });

export const draftRouter = createTRPCRouter({
  getState,
  start,
  pick,
  auto,
});

////////////////

async function makePick(ctx: TRPCContext, input: z.infer<typeof makePickObj>) {
  const film = await ctx.prisma.studioFilm.create({
    data: {
      tmdbId: input.tmdbId,
      title: input.title,
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
  const slot = session!.settings.teamStructure.find((e) => e.pos === film.slot);
  const nextStudio = session?.studios.find(
    (e) => e.ownerId === getStudioOwnerByPick(session!.settings.draft.order, sessionFilms.length + 1),
  );
  const draftState = {
    sessionId: input.sessionId,
    currentPick: {
      studioId: nextStudio?.id,
      num: sessionFilms.length + 1,
      startTimestamp: ts,
      endTimestamp: ts + session!.settings.draft.timePerRound * 1000,
    },
    newActivities: [`${studio?.name} drafted ${input.title}${slot ? " in their " + slot.type + " slot" : ""}`],
    lastPick: film,
  };

  await draftEvent<typeof draftState>(`draft:${input.sessionId}:draft-update`, draftState);
  return input.sessionId;
}

export async function autoDraft(ctx: TRPCContext, sessionId: string, studioId: string, pick: number) {
  console.log("here");
  const picks = await ctx.prisma.studioFilm.findMany({
    where: { studio: { sessionId } },
  });
  if (picks.length >= pick) return;

  const session = await getSessionById(ctx, sessionId);
  if (!session) throw "No session";
  if (picks.length === session?.settings.draft.numRounds * session?.studios.length) return;

  const films = await getFilmsBySessionId(ctx, sessionId);
  const unavailable = await ctx.prisma.studioFilm.findMany({
    where: { studio: { sessionId } },
    orderBy: { slot: "asc" },
  });
  const unavailableIds = unavailable.map((e) => e.tmdbId);
  const bestAvailable = films?.results.filter((e) => !unavailableIds.includes(e.id))[0];
  if (!bestAvailable) throw "No available films";

  const drafted = unavailable.filter((e) => e.studioId === studioId);
  let openSlot = 1;
  for (const film of drafted)
    if (openSlot !== film.slot) break;
    else openSlot++;

  console.log({
    sessionId,
    studioId,
    tmdbId: bestAvailable.id,
    title: bestAvailable.title,
    slot: openSlot,
  });

  await makePick(ctx, {
    sessionId,
    studioId,
    tmdbId: bestAvailable.id,
    title: bestAvailable.title,
    slot: openSlot,
  });
}

function getStudioOwnerByPick(draftOrder: string[], pick: number) {
  const round = Math.ceil(pick / draftOrder.length);
  const studioIndex = round * draftOrder.length - pick;
  const studio = round % 2 === 0 ? draftOrder[studioIndex] ?? "" : [...draftOrder].reverse()[studioIndex];
  return studio ?? "";
}
