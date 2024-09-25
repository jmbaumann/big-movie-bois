import { z } from "zod";

export const getFilmsForSessionObj = z.object({
  sessionId: z.string(),
  studioId: z.string(),
  page: z.number(),
  options: z
    .object({
      today: z.boolean().optional(),
      excludeMyFilms: z.boolean().optional(),
      excludeAcquiredFilms: z.boolean().optional(),
    })
    .optional(),
});
