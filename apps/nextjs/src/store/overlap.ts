import { inferRouterOutputs } from "@trpc/server";
import { create } from "zustand";

import { AppRouter } from "@repo/api";

type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];

export type OverlapAnswerDetails = {
  value: string;
  revealed: boolean;
  gt?: string;
  lt?: string;
  e?: boolean;
  image?: string;
};

export interface OverlapGameState {
  title: OverlapAnswerDetails;
  releaseYear: OverlapAnswerDetails;
  runtime: OverlapAnswerDetails;
  certification: OverlapAnswerDetails;
  budget: OverlapAnswerDetails;
  revenue: OverlapAnswerDetails;
  directors: OverlapAnswerDetails[];
  writers: OverlapAnswerDetails[];
  cast: OverlapAnswerDetails[];
  genres: OverlapAnswerDetails[];
  keywords: OverlapAnswerDetails[];
}

export interface OverlapGameData {
  game: {
    state: OverlapGameState;
    guesses: TMDBMovie[];
    gameOver: boolean;
    timestamps: {
      lastCompleted: number;
      lastPlayed: number;
    };
  };
  stats: {
    gamesPlayed: number;
    wins: number;
    streak: number;
    isOnStreak: boolean;
    winStreak: number;
  };
  timestamp: number;
}
