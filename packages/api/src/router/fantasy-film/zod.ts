import { z } from "zod";

import { DRAFT_TYPES, STUDIO_SLOT_TYPES } from "../../enums";
import { toZodEnum } from "../../utils";

export const createLeagueSessionInputObj = z.object({
  leagueId: z.string(),
  name: z.string().min(2).max(50),
  startDate: z.date(),
  endDate: z.date(),
  settings: z.object({
    draft: z.object({
      date: z.date().optional(),
      hour: z.string().optional(),
      min: z.string().optional(),
      ampm: z.string().optional(),
      type: z.enum(toZodEnum(DRAFT_TYPES)),
      order: z.array(z.string()),
      numRounds: z.coerce.number(),
      timePerRound: z.coerce.number(),
    }),
    teamStructure: z.array(
      z.object({
        type: z.enum(toZodEnum(STUDIO_SLOT_TYPES)),
        pos: z.number(),
      }),
    ),
  }),
});
