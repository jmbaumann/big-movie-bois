import { awardShowRouter } from "./router/award-show";
import { contactRouter } from "./router/contact";
import { cronRouter } from "./router/cron";
import { overlapRouter } from "./router/daily-games/overlap";
import {
  ffAdminRouter,
  ffDraftRouter,
  ffFilmRouter,
  ffLeagueRouter,
  ffLeagueSessionRouter,
  ffStudioRouter,
} from "./router/fantasy-film";
import { pollRouter } from "./router/poll";
import { tmdbRouter } from "./router/tmdb";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  cron: cronRouter,
  ffAdmin: ffAdminRouter,
  ffLeague: ffLeagueRouter,
  ffLeagueSession: ffLeagueSessionRouter,
  ffStudio: ffStudioRouter,
  ffFilm: ffFilmRouter,
  ffDraft: ffDraftRouter,
  awardShow: awardShowRouter,
  overlap: overlapRouter,
  tmdb: tmdbRouter,
  poll: pollRouter,
  user: userRouter,
  contact: contactRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
