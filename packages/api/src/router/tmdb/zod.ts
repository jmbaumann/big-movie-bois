import { z } from "zod";

export const getFilmsForSessionObj = z.object({
  sessionId: z.string(),
  page: z.number(),
  today: z.boolean().optional(),
  maxPopularity: z.number().optional(),
});
