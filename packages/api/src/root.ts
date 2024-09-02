import { exampleRouter } from "./router/example";
import { ffLeagueRouter } from "./router/fantasy-film";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  ffLeague: ffLeagueRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
