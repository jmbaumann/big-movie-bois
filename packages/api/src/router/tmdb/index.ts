import { add, format, max, nextTuesday, sub } from "date-fns";
import e from "express";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { getByDateRange, getDetailsById, getMovieFromTMDB } from "./tmdb";
import { TMDBSearchResponse } from "./types";

const POPULARITY_THRESHOLD = 10;

const search = publicProcedure.input(z.object({ keyword: z.string() })).query(async ({ ctx, input }) => {
  const url = `https://api.themoviedb.org/3/search/movie?query=${input.keyword}&include_adult=false&language=en-US&page=1`;
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    },
  };

  try {
    const res = await fetch(url, options);
    const data: TMDBSearchResponse = await res.json();
    // TODO: handle duplicate titles
    return data.results.filter((e) => e.popularity >= POPULARITY_THRESHOLD).map((e) => ({ id: e.id, title: e.title }));
  } catch (error) {
    console.error(error);
  }
});

const getMasterFFList = protectedProcedure
  .input(z.object({ page: z.number().min(1) }))
  .query(async ({ ctx, input }) => {
    const total = await ctx.prisma.tMDBDetails.count({ where: { releaseDate: { gte: "2024-09-01" } } });
    const list = await ctx.prisma.tMDBDetails.findMany({
      include: { cast: true, crew: true },
      where: { releaseDate: { gte: "2024-09-01" } },
      skip: (input.page - 1) * 20,
      take: 20,
      orderBy: { releaseDate: "asc" },
    });

    return {
      data: list,
      total,
    };
  });

const getById = publicProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
  return getByTMDBId(ctx, input.id);
});

const getFilmsForSession = publicProcedure
  .input(
    z.object({
      sessionId: z.string(),
      studioId: z.string(),
      page: z.number(),
      options: z
        .object({
          today: z.boolean().optional(),
          excludeMyFilms: z.boolean().optional(),
          excludeAcquiredFilms: z.boolean().optional(),
        })
        .optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = await ctx.prisma.leagueSession.findFirst({ where: { id: input.sessionId } });
    if (!session) throw "No session";

    const { today, excludeMyFilms, excludeAcquiredFilms } = input.options ?? {};

    const from = today
      ? format(max([new Date(), session.startDate]), "yyyy-MM-dd")
      : format(session.startDate, "yyyy-MM-dd");
    const to = format(session.endDate, "yyyy-MM-dd");
    const defaultWhere = { AND: [{ releaseDate: { gte: from } }, { releaseDate: { lte: to } }] };

    let where = {};
    if (excludeMyFilms)
      where = {
        ...defaultWhere,
        studioFilms: {
          none: {
            studioId: input.studioId,
          },
        },
      };
    else if (excludeAcquiredFilms)
      where = {
        ...defaultWhere,
        studioFilms: {
          none: {
            studio: {
              sessionId: input.sessionId,
            },
          },
        },
      };

    const total = await ctx.prisma.tMDBDetails.count({ where });
    const list = await ctx.prisma.tMDBDetails.findMany({
      where,
      skip: (input.page - 1) * 20,
      take: 20,
      orderBy: { popularity: "desc" },
    });

    return {
      data: list,
      total,
    };
  });

const getActive = protectedProcedure.input(z.object({ page: z.number().min(1) })).query(async ({ ctx, input }) => {
  const where = {
    studioFilms: {
      some: {
        studio: {
          session: {
            AND: [{ startDate: { lte: new Date() } }, { endDate: { gte: new Date() } }],
          },
        },
      },
    },
  };

  const total = await ctx.prisma.tMDBDetails.count({ where });
  const list = await ctx.prisma.tMDBDetails.findMany({
    include: { cast: true, crew: true },
    where,
    skip: (input.page - 1) * 20,
    take: 20,
    orderBy: { releaseDate: "asc" },
  });

  return {
    data: list,
    total,
  };
});

const updateFantasyFilms = protectedProcedure.mutation(async ({ ctx, input }) => {
  await updateMasterFantasyFilmList(ctx);
});

export const tmdbRouter = createTRPCRouter({
  search,
  getMasterFFList,
  getById,
  getFilmsForSession,
  getActive,
  updateFantasyFilms,
});

////////////////

export async function getByTMDBId(ctx: TRPCContext, id: number, noReturn?: boolean) {
  const film = await ctx.prisma.tMDBDetails.findFirst({ include: { cast: true, crew: true }, where: { id } });
  if (film) return film;

  const tmdb = await getMovieFromTMDB(id);
  await ctx.prisma.tMDBDetails.create({ data: { ...tmdb.details, createdAt: new Date() } });
  await ctx.prisma.tMDBCast.createMany({ data: tmdb.cast });
  await ctx.prisma.tMDBCrew.createMany({ data: tmdb.crew });

  if (noReturn) return;

  return await ctx.prisma.tMDBDetails.findFirst({ include: { cast: true, crew: true }, where: { id } });
}

async function updateMasterFantasyFilmList(ctx: TRPCContext) {
  // get top 100 films from tmdb (from today -> +400 days)
  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(add(new Date(), { days: 400 }), "yyyy-MM-dd");

  const chunks = await Promise.all(Array.from({ length: 5 }).map((_, i) => getByDateRange(from, to, i + 1)));
  const films = chunks
    .filter((e) => e !== undefined)
    .map((e) => e!.results)
    .flat();

  console.log(
    chunks
      .map((e) => e?.results)
      .flat()
      .map((e) => e?.title),
  );

  for (const f of films) {
    console.log(f.title);
  }

  const inDb = await ctx.prisma.tMDBDetails.findMany({
    select: { id: true },
    where: { id: { in: films.map((e) => e?.id) } },
  });
  const inDbIds = new Set(inDb.map((e) => e.id));
  const toCreate = films.filter((e) => !inDbIds.has(e.id));
  const toUpdate = films
    .filter((e) => inDbIds.has(e.id))
    .map((e) => ({
      id: e.id,
      title: e.title,
      overview: e.overview,
      poster: e.poster_path,
      releaseDate: e.release_date,
      popularity: e.popularity,
      rating: e.vote_count,
      updatedAt: new Date(),
    }));

  // update existing
  for (const update of toUpdate) await ctx.prisma.tMDBDetails.update({ data: update, where: { id: update.id } });

  // create new entries
  for (const create of toCreate) await getByTMDBId(ctx, create.id, true);

  // update active films outside of top 260
  const remaining = await ctx.prisma.tMDBDetails.findMany({
    where: {
      updatedAt: { lt: new Date() },
      studioFilms: {
        some: {
          studio: {
            session: {
              AND: [{ startDate: { lte: new Date() } }, { endDate: { gte: new Date() } }],
            },
          },
        },
      },
    },
  });

  for (const film of remaining) {
    const details = await getDetailsById(film.id);
    if (!details) continue;

    const data = {
      id: details.id,
      title: details.title,
      overview: details.overview,
      poster: details.poster_path,
      releaseDate: details.release_date,
      popularity: details.popularity,
      rating: details.vote_count,
      updatedAt: new Date(),
    };
    await ctx.prisma.tMDBDetails.update({ data, where: { id: film.id } });
  }
}
