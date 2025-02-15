import { z } from "zod";

import { toZodEnum } from "../../utils";

export const tournamentInputObject = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  rounds: z
    .array(
      z.object({
        id: z.string().optional(),
        tournamentId: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .optional(),
});

export type TournamentInput = z.infer<typeof tournamentInputObject>;
