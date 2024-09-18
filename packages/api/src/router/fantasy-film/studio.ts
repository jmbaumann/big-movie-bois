import { z } from "zod";

import { LeagueSessionStudio, Prisma } from "@repo/db";

import { BID_STATUSES } from "../../enums";
import { createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { getByTMDBId } from "../tmdb";
import { getFilmScore, getFilmScores } from "./film";
import { FilmScores } from "./score";
import { getSessionById } from "./session";
import { createLeagueSessionStudioObj } from "./zod";

type FilmWithTMDB = Awaited<ReturnType<typeof getByTMDBId>>;
type StudioFilm = Omit<
  Prisma.LeagueSessionStudioGetPayload<{
    include: { films: true };
  }>["films"][number],
  "tmdb"
> & {
  tmdb: FilmWithTMDB;
  scores: FilmScores;
  score: number;
};
type Studio = Prisma.LeagueSessionStudioGetPayload<{
  include: { owner: { select: { name: true } } };
}> & {
  rank: number;
  films: StudioFilm[];
};

const getStudios = protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
  const list = await ctx.prisma.leagueSessionStudio.findMany({
    where: {
      sessionId: input.sessionId,
    },
    include: {
      owner: { select: { name: true } },
      films: true,
    },
    orderBy: { score: "desc" },
  });

  for (const studio of list) await getStudioFilmsAndScore(ctx, studio, input.sessionId);

  const studios = getStudiosRanks(list);

  return studios as Studio[];
});

const getMyStudio = protectedProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
  const studio = await ctx.prisma.leagueSessionStudio.findFirst({
    where: {
      sessionId: input.sessionId,
      ownerId: ctx.session.user.id,
    },
    include: {
      films: true,
    },
  });
  if (!studio) throw "No studio found";

  await getStudioFilmsAndScore(ctx, studio, input.sessionId);

  return studio as LeagueSessionStudio & { films: StudioFilm[] };
});

const getOpposingStudios = protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    const list = await ctx.prisma.leagueSessionStudio.findMany({
      where: {
        sessionId: input.sessionId,
      },
      include: { films: true },
      orderBy: { score: "desc" },
    });

    const opposing = list.map((e, i) => ({ ...e, rank: i + 1 })).filter((e) => e.ownerId !== ctx.session.user.id);

    for (const studio of opposing) await getStudioFilmsAndScore(ctx, studio, input.sessionId);

    return opposing as (LeagueSessionStudio & {
      rank: number;
      films: StudioFilm[];
    })[];
  });

const create = protectedProcedure.input(createLeagueSessionStudioObj).mutation(async ({ ctx, input }) => {
  const user = await ctx.prisma.user.findFirst({
    where: { id: input.ownerId },
  });
  const name = `${user?.name}'s Studio`;
  return await ctx.prisma.leagueSessionStudio.create({
    data: {
      sessionId: input.sessionId,
      ownerId: input.ownerId,
      name,
      image: getRandomIcon(),
      budget: 100,
      createdAt: new Date(),
    },
  });
});

const update = protectedProcedure
  .input(z.object({ id: z.string(), name: z.string(), image: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.leagueSessionStudio.update({
      data: {
        name: input.name,
        image: input.image,
        updatedAt: new Date(),
        updatedBy: ctx.session.user.id,
      },
      where: {
        id: input.id,
      },
    });
  });

const getFavorites = protectedProcedure.input(z.object({ studioId: z.string() })).query(async ({ ctx, input }) => {
  return await ctx.prisma.studioFavorite.findMany({ where: input });
});

const addFavorite = protectedProcedure
  .input(z.object({ studioId: z.string(), tmdbId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.studioFavorite.create({ data: input });
  });

const removeFavorite = protectedProcedure
  .input(z.object({ studioId: z.string(), tmdbId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.studioFavorite.delete({
      where: { studioId_tmdbId: input },
    });
  });

const getBids = protectedProcedure.input(z.object({ studioId: z.string() })).query(async ({ ctx, input }) => {
  return await ctx.prisma.filmBid.findMany({
    where: { studioId: input.studioId, status: BID_STATUSES.PENDING },
  });
});

const bid = protectedProcedure
  .input(
    z.object({
      studioId: z.string(),
      tmdbId: z.number(),
      amount: z.number(),
      slot: z.number(),
      dropFilmId: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const data = {
      ...input,
      status: BID_STATUSES.PENDING,
      createdAt: new Date(),
    };
    return await ctx.prisma.filmBid.create({ data });
  });

const updateBid = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      studioId: z.string(),
      tmdbId: z.number(),
      amount: z.number(),
      dropFilmId: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const data = {
      ...input,
      status: BID_STATUSES.PENDING,
      createdAt: new Date(),
    };
    return await ctx.prisma.filmBid.update({ data, where: { id: input.id } });
  });

const deleteBid = protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
  return await ctx.prisma.filmBid.delete({ where: { id: input.id } });
});

export const studioRouter = createTRPCRouter({
  getStudios,
  getMyStudio,
  getOpposingStudios,
  create,
  update,
  getFavorites,
  addFavorite,
  removeFavorite,
  getBids,
  bid,
  updateBid,
  deleteBid,
});

////////////////

async function getStudioFilmsAndScore(
  ctx: TRPCContext,
  studio: Prisma.LeagueSessionStudioGetPayload<{
    include: { films: true };
  }>,
  sessionId: string,
) {
  const session = await getSessionById(ctx, sessionId);

  if (studio && studio.films.length > 0)
    studio.films = await Promise.all(
      studio.films.map(async (film) => {
        const tmdb = await getByTMDBId(film.tmdbId);
        const scores = await getFilmScores({ ...film, tmdb });
        const score = await getFilmScore(ctx, session!, {
          ...film,
          tmdb,
          scores,
        });
        return {
          ...film,
          tmdb,
          scores,
          score,
        };
      }),
    );

  studio.score = Math.round(studio.films.map((e) => e.score).reduce((a, b) => a + b, 0) * 10) / 10;
  await ctx.prisma.leagueSessionStudio.update({
    data: { score: studio.score },
    where: { id: studio.id },
  });
}

export async function createManyStudios(ctx: TRPCContext, input: z.infer<typeof createLeagueSessionStudioObj>[]) {
  const users = await ctx.prisma.user.findMany({
    where: { id: { in: input.map((e) => e.ownerId) } },
  });
  const data = input.map((e) => ({
    ...createLeagueSessionStudioObj.parse(e),
    name: `${users.find((u) => u.id === e.ownerId)?.name}'s Studio`,
    image: getRandomIcon(),
    budget: 100,
    createdAt: new Date(),
  }));
  return await ctx.prisma.leagueSessionStudio.createMany({
    data,
  });
}

function getStudiosRanks(studios: LeagueSessionStudio[]) {
  const list = studios.map((e) => ({ ...e, rank: 0 }));
  for (let i = 0; i < list.length; i++) {
    const studio = list[i] as LeagueSessionStudio & { rank: number };

    if (i === 0) studio.rank = 1;
    else {
      const before = [...list].splice(0, i).filter((e) => e.score > studio.score);
      studio.rank = before.length + 1;
    }
  }

  return list;
}

function getRandomIcon() {
  const colors = ["#000000", "#525252", "#dc2626", "#ea580c", "#84cc16", "#0ea5e9", "#9333ea", "#db2777"];
  const icons = [
    "clapperboard",
    "disc3",
    "eye",
    "film",
    "heart",
    "popcorn",
    "projector",
    "sofa",
    "star",
    "tv",
    "video",
    "videotape",
  ];

  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomIcon = icons[Math.floor(Math.random() * icons.length)];

  return `${randomIcon}${randomColor}`;
}
