import {
  AwardShowCategory as AwardShowCategoryDB,
  AwardShow as AwardShowDB,
  AwardShowGroup as AwardShowGroupDB,
  AwardShowNominee as AwardShowNomineeDB,
  AwardShowPick,
  AwardShowYear as AwardShowYearDB,
  League,
  LeagueYear as LeagueYearDB,
  Movie as MovieDB,
  Studio as StudioDB,
  User,
} from "@prisma/client";

export type LeagueYear = League &
  LeagueYearDB & {
    studios: Studio[];
    draft: Date | null | undefined;
    settings: LeagueSettings;
    ownerName?: string;
  };

export type Studio = StudioDB & {
  movies: Movie[];
  owner: User;
};

export type Movie = MovieDB & {
  details?: TMDBMovie;
};

export type TMDBMovie = {
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
};

export interface LeagueSettings {
  draft: {
    type: "snake" | "linear";
    order: string[];
    roundTime: number;
  };
  teamStructure: {
    type:
      | "openingWeekendBoxOffice"
      | "totalBoxOffice"
      | "letterboxdNumWatched"
      | "letterboxdRating"
      | "reverseLetterboxdRating"
      | "oscarWins";
    pos: number;
  }[];
}

export interface DraftState {
  started: boolean;
  currentPick: {
    num: number;
    startTimestamp: number;
    endTimestamp: number;
  };
  picks: Movie[];
  activities: string[];
}

export interface DraftStateUpdate {
  currentPick: {
    num: number;
    startTimestamp: number;
    endTimestamp: number;
  };
  lastPick?: Movie;
  newActivities: string[];
}

export type AwardShow = AwardShowDB & {
  years?: AwardShowYear[];
  awardShowYearId: string;
  available: Date | null;
  locked: Date | null;
};

export type AwardShowYear = AwardShowDB &
  AwardShowYearDB & { categories: AwardShowCategory[] };

export type AwardShowCategory = AwardShowCategoryDB & {
  nominees: AwardShowNominee[];
};

export type AwardShowNominee = AwardShowNomineeDB & {
  details?: TMDBMovie;
};

export type AwardShowGroup = AwardShowGroupDB & {
  picks?: AwardShowPick[];
};
