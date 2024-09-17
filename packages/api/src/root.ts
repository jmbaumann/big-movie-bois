import { overlapRouter } from "./router/daily-games/overlap";
import {
  ffAdminRouter,
  ffDraftRouter,
  ffFilmRouter,
  ffLeagueRouter,
  ffLeagueSessionRouter,
  ffStudioRouter,
} from "./router/fantasy-film";
import { tmdbRouter } from "./router/tmdb";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  ffAdmin: ffAdminRouter,
  ffLeague: ffLeagueRouter,
  ffLeagueSession: ffLeagueSessionRouter,
  ffStudio: ffStudioRouter,
  ffFilm: ffFilmRouter,
  ffDraft: ffDraftRouter,
  overlap: overlapRouter,
  tmdb: tmdbRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
