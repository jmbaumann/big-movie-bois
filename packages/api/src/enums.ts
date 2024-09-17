export const STUDIO_SLOT_TYPES = {
  TOTAL_BOX_OFFICE: "Total Box Office",
  OPENING_WEEKEND_BOX_OFFICE: "Opening Weekend Box Office",
  IMDB_RATING: "IMDb Rating",
  REVERSE_IMDB_RATING: "Reverse IMDb Rating",
  RT_TOMATOMETER: "Rotten Tomatoes Tomatometer",
  RT_POPCORNMETER: "Rotten Tomatoes Popcornmeter",
  REVERSE_RT_TOMATOMETER: "Reverse Rotten Tomatoes Tomatometer",
  REVERSE_RT_POPCORNMETER: "Reverse Rotten Tomatoes Popcornmeter",
  RT_DISPARITY: "Rotten Tomatoes Score Disparity",
  LETTERBOXD_RATING: "Letterboxd Rating",
  REVERSE_LETTERBOXD_RATING: "Reverse Letterboxd Rating",
  LETTERBOXD_NUM_WATCHED: "Letterboxd # Watched",
} as const;

export const DRAFT_TYPES = {
  SNAKE: "Snake",
  LINEAR: "Linear",
} as const;

export const LEAGUE_INVITE_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
};

export const BID_STATUSES = {
  PENDING: "pending",
  WON: "won",
  LOST: "lost",
  INVALID: "invalid",
};
