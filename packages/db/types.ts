import {
  League,
  LeagueSession as LeagueSessionDB,
  LeagueSessionStudio as StudioDB,
  StudioFilm as StudioFilmDB,
  User,
} from "@prisma/client";

export type Session = League &
  LeagueSessionDB & {
    studios: Studio[];
    draft: Date | null | undefined;
    settings: LeagueSettings;
    ownerName?: string;
  };

export type Studio = StudioDB & {
  films: Film[];
  owner: User;
};

export type Film = StudioFilmDB & {
  details?: TMDBFilm;
};

export type TMDBFilm = {
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
  picks: Film[];
  activities: string[];
}

export interface DraftStateUpdate {
  currentPick: {
    num: number;
    startTimestamp: number;
    endTimestamp: number;
  };
  lastPick?: Film;
  newActivities: string[];
}
