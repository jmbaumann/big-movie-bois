import { add, format, max, nextTuesday, sub } from "date-fns";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure, TRPCContext } from "../../trpc";
import { getByDateRange, getDetailsById, getMovieFromTMDB } from "./tmdb";
import { TMDBSearchResponse } from "./types";
import { getFilmsForSessionObj } from "./zod";

const POPULARITY_THRESHOLD = 10;

const search = publicProcedure.input(z.object({ keyword: z.string() })).query(async ({ ctx, input }) => {
  const url = `https://api.themoviedb.org/3/search/movie?query=${input.keyword}&include_adult=false&language=en-US&with_release_type=3&sort_by=popularity.desc&page=1`;
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

    let list = data.results
      .filter((e) => e.popularity >= POPULARITY_THRESHOLD)
      .sort((a, b) => b.popularity - a.popularity)
      .map((e) => ({ id: e.id, title: e.title, year: e.release_date ? format(e.release_date, "yyyy") : "" }));

    const titleCount: Record<string, number> = {};
    list.forEach((movie) => {
      titleCount[movie.title] = (titleCount[movie.title] || 0) + 1;
    });

    const movies = list.map((movie) => {
      if ((titleCount[movie.title] ?? 0) > 1) return { ...movie, title: `${movie.title} (${movie.year})` };
      return movie;
    });

    return movies;
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

const getFilmsForSession = publicProcedure.input(getFilmsForSessionObj).query(async ({ ctx, input }) => {
  return await getFilmsBySessionId(ctx, input);
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

const getOpeningWeekend = protectedProcedure.query(async ({ ctx }) => {
  const from = format(sub(new Date(), { days: 15 }), "yyyy-MM-dd");
  const to = format(new Date(), "yyyy-MM-dd");

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
    AND: [{ releaseDate: { gte: from } }, { releaseDate: { lte: to } }],
  };

  return ctx.prisma.tMDBDetails.findMany({
    where,
    orderBy: { releaseDate: "desc" },
  });
});

const update = adminProcedure
  .input(z.object({ id: z.number(), openingWeekend: z.number() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.tMDBDetails.update({ data: { openingWeekend: input.openingWeekend }, where: { id: input.id } });
  });

const refresh = adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
  const tmdb = await getMovieFromTMDB(input.id);

  await ctx.prisma.tMDBCast.deleteMany({ where: { tmdbId: input.id } });
  await ctx.prisma.tMDBCrew.deleteMany({ where: { tmdbId: input.id } });

  await ctx.prisma.tMDBDetails.update({ data: { ...tmdb.details, updatedAt: new Date() }, where: { id: input.id } });
  await ctx.prisma.tMDBCast.createMany({ data: tmdb.cast! });
  await ctx.prisma.tMDBCrew.createMany({ data: tmdb.crew! });

  return await ctx.prisma.tMDBDetails.findFirst({ include: { cast: true, crew: true }, where: { id: input.id } });
});

const updateFantasyFilms = protectedProcedure.mutation(async ({ ctx }) => {
  await updateMasterFantasyFilmList(ctx);
});

export const tmdbRouter = createTRPCRouter({
  search,
  getMasterFFList,
  getById,
  getFilmsForSession,
  getActive,
  getOpeningWeekend,
  update,
  refresh,
  updateFantasyFilms,
});

////////////////

export async function getByTMDBId(ctx: TRPCContext, id: number, options?: { noReturn?: boolean; refresh?: boolean }) {
  const film = await ctx.prisma.tMDBDetails.findFirst({ include: { cast: true, crew: true }, where: { id } });
  if (film) return film;

  const tmdb = await getMovieFromTMDB(id);
  await Promise.allSettled([
    ctx.prisma.tMDBDetails.create({ data: { ...tmdb.details, createdAt: new Date() } }),
    ctx.prisma.tMDBCast.createMany({ data: tmdb.cast! }),
    ctx.prisma.tMDBCrew.createMany({ data: tmdb.crew! }),
  ]);

  if (options?.noReturn) return;

  return await ctx.prisma.tMDBDetails.findFirst({ include: { cast: true, crew: true }, where: { id } });
}

export async function getFilmsBySessionId(ctx: TRPCContext, input: z.infer<typeof getFilmsForSessionObj>) {
  const session = await ctx.prisma.leagueSession.findFirst({ where: { id: input.sessionId } });
  if (!session) throw "No session";

  const { today, excludeMyFilms, excludeAcquiredFilms } = input.options ?? {};

  const fromDate = today ? max([new Date(), session.startDate]) : session.startDate;
  const from = format(add(fromDate, { days: 7 }), "yyyy-MM-dd");
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
}

export async function updateMasterFantasyFilmList(ctx: TRPCContext) {
  // get top 100 films from tmdb (from today -> +400 days)
  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(add(new Date(), { days: 400 }), "yyyy-MM-dd");

  const chunks = await Promise.all(Array.from({ length: 5 }).map((_, i) => getByDateRange(from, to, i + 1)));
  const topFilmIds = chunks
    .filter((e) => e !== undefined)
    .map((e) => e!.results)
    .flat()
    .map((e) => e.id);

  const inDb = await ctx.prisma.tMDBDetails.findMany({
    select: { id: true },
    where: { id: { in: topFilmIds } },
  });
  const inDbIds = new Set(inDb.map((e) => e.id));
  const toCreateIds = topFilmIds.filter((e) => !inDbIds.has(e));
  const toUpdateIds = topFilmIds.filter((e) => inDbIds.has(e));

  // update active films outside of top 100
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
  for (const r of remaining) toUpdateIds.push(r.id);

  // create new entries
  const createPromises = [];
  for (const id of toCreateIds) createPromises.push(getByTMDBId(ctx, id, { noReturn: true }));
  await Promise.allSettled(createPromises);

  // update existing
  const updatePromises = [];
  for (const id of toUpdateIds) {
    updatePromises.push(
      (async () => {
        const { details } = await getMovieFromTMDB(id, true);
        if (details) {
          const data = {
            id: details.id,
            title: details.title,
            overview: details.overview,
            poster: details.poster,
            releaseDate: details.releaseDate,
            popularity: details.popularity,
            rating: details.rating,
            revenue: details.revenue,
            updatedAt: new Date(),
          };
          await ctx.prisma.tMDBDetails.update({ data, where: { id } });
        }
      })(),
    );
  }
  await Promise.allSettled(updatePromises);
}
