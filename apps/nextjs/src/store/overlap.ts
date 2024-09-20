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
    streak: string;
    isOnStreak: boolean;
    winStreak: number;
  };
  timestamp: number;
}

interface LocalStore extends OverlapGameData {
  update: (newState: OverlapGameData) => void;
  newGame: () => void;
  reload: () => void;
  reset: () => void;
  resetToday: () => void;
}

const LOCAL_STOREAGE_KEY = "overlap-daily";

const defaultState = {
  game: {
    choice: undefined,
    gameOver: false,
    timestamps: {
      lastCompleted: 0,
      lastPlayed: 0,
    },
  },
  stats: {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: "",
    isOnStreak: false,
    winStreak: 0,
  },
  timestamp: new Date().getTime(),
} as OverlapGameData;

const getInitialState = () => {
  let gs = { ...defaultState };
  if (typeof window !== "undefined") {
    const ls = localStorage.getItem(LOCAL_STOREAGE_KEY);
    if (ls) gs = JSON.parse(ls) as OverlapGameData;
  }
  return gs;
};

export const useLocalStore = create<LocalStore>((set) => ({
  ...getInitialState(),
  update: (newState: OverlapGameData) =>
    set(() => {
      saveState(newState);
      return newState;
    }),
  newGame: () =>
    set((state) => {
      let newGameState = { ...state };
      newGameState = {
        ...state,
        game: {
          ...state.game,
          choice: undefined,
          gameOver: false,
        },
      };
      saveState(newGameState);
      return newGameState;
    }),
  reload: () =>
    set(() => {
      const s = getInitialState();
      return s;
    }),
  reset: () =>
    set(() => {
      saveState(defaultState);
      return defaultState;
    }),
  resetToday: () =>
    set((state) => {
      const yesterdayTS = new Date().getTime() - 86400000;
      let newGameState = { ...state };
      newGameState = {
        ...state,
        game: {
          ...state.game,
          choice: undefined,
          gameOver: false,
          timestamps: {
            lastCompleted: yesterdayTS,
            lastPlayed: yesterdayTS,
          },
        },
      };
      saveState(newGameState);
      return newGameState;
    }),
}));

export interface TweetStore {
  header: string;
  stats: string;
  update: (newState: { header: string; stats: string }) => void;
}

export const useTweetStore = create<TweetStore>((set) => ({
  header: "",
  stats: "",
  update: (newState: { header: string; stats: string }) => set(() => newState),
}));

function saveState(state: OverlapGameData) {
  const ls = localStorage.getItem(LOCAL_STOREAGE_KEY);
  if (ls) {
    const gs = JSON.parse(ls) as OverlapGameData;
    if (gs.stats.gamesPlayed > 0 && state.stats.gamesPlayed === 0) return;
  }

  localStorage.setItem(LOCAL_STOREAGE_KEY, JSON.stringify({ ...state, timestamp: new Date().getTime() }));
}
