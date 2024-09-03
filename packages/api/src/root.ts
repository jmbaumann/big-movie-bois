import { overlapRouter } from "./router/daily-games/overlap";
import { exampleRouter } from "./router/example";
import { ffLeagueRouter } from "./router/fantasy-film";
import { tmdbRouter } from "./router/tmdb";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  ffLeague: ffLeagueRouter,
  overlap: overlapRouter,
  tmdb: tmdbRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
