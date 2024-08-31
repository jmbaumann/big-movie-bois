import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";
export type {
  LeagueYear,
  Studio,
  Movie,
  TMDBMovie,
  LeagueSettings,
  DraftState,
  DraftStateUpdate,
  AwardShow,
  AwardShowYear,
  AwardShowCategory,
  AwardShowGroup,
} from "./types";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
