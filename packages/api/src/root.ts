import { overlapRouter } from "./router/daily-games/overlap";
import { exampleRouter } from "./router/example";
import { ffLeagueRouter, ffLeagueSessionRouter } from "./router/fantasy-film";
import { tmdbRouter } from "./router/tmdb";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  ffLeague: ffLeagueRouter,
  ffLeagueSession: ffLeagueSessionRouter,
  overlap: overlapRouter,
  tmdb: tmdbRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
