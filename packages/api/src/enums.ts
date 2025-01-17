export const STUDIO_SLOT_TYPES = {
  TOTAL_BOX_OFFICE: "Total Box Office",
  OPENING_WEEKEND_BOX_OFFICE: "Opening Weekend Box Office",
  TMDB_RATING: "TMDB Rating",
  REVERSE_TMDB_RATING: "Reverse TMDB Rating",
  // IMDB_RATING: "IMDb Rating",
  // REVERSE_IMDB_RATING: "Reverse IMDb Rating",
  // RT_TOMATOMETER: "Rotten Tomatoes Tomatometer",
  // RT_POPCORNMETER: "Rotten Tomatoes Popcornmeter",
  // REVERSE_RT_TOMATOMETER: "Reverse Rotten Tomatoes Tomatometer",
  // REVERSE_RT_POPCORNMETER: "Reverse Rotten Tomatoes Popcornmeter",
  // RT_DISPARITY: "Rotten Tomatoes Score Disparity",
  // LETTERBOXD_RATING: "Letterboxd Rating",
  // REVERSE_LETTERBOXD_RATING: "Reverse Letterboxd Rating",
  // LETTERBOXD_NUM_WATCHED: "Letterboxd # Watched",
} as const;

export const DRAFT_TYPES = {
  SNAKE: "Snake",
  LINEAR: "Linear",
} as const;

export const LEAGUE_INVITE_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const;

export const BID_STATUSES = {
  PENDING: "pending",
  WON: "won",
  LOST: "lost",
  IGNORED: "ignored",
  INVALID: "invalid",
  PURCHASE: "purchase",
} as const;

export const SESSION_ACTIVITY_TYPES = {
  FILM_SWAP: "film-swap",
  FILM_PURCHASED: "film-purchased",
  FILM_DROP: "film-drop",
  BID_WON: "bid-won",
  STUDIO_UPDATE: "studio-update",
  ADMIN_ACTION: "admin-action",
  AUTOMATED: "automated",
} as const;

export const FILM_ACQUISITION_TYPES = {
  DRAFTED: "Drafted",
  WON_BID: "Won Bid",
  TRADED: "Traded",
  PURCHASED: "Purchased",
  ADMIN_ADDED: "Admin Added",
} as const;
