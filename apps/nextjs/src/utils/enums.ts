// TODO: move these to a package

export const STUDIO_SLOT_TYPES = {
  TOTAL_BOX_OFFICE: "Total Box Office",
  OPENING_WEEKEND_BOX_OFFICE: "Opening Weekend Box Office",
  IMDB_RATING: "IMDb Rating",
  REVERSE_IMDB_RATING: "Reverse IMDb Rating",
  RT_CRITIC_SCORE: "Rotten Tomatoes Critic Score",
  RT_AUDIENCE_SCORE: "Rotten Tomatoes Audience Score",
  RT_DISPARITY: "Rotten Tomatoes Score Disparity",
  REVERSE_RT_CRITIC_SCORE: "Reverse Rotten Tomatoes Critic Score",
  REVERSE_RT_AUDIENCE_SCORE: "Reverse Rotten Tomatoes Audience Score",
  LETTERBOXD_RATING: "Letterboxd Rating",
  REVERSE_LETTERBOXD_RATING: "Reverse Letterboxd Rating",
  LETTERBOXD_NUM_WATCHED: "Letterboxd # Watched",
} as const;

export const DRAFT_TYPES = {
  SNAKE: "Snake",
  LINEAR: "Linear",
} as const;
