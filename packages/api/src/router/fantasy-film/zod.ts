import { z } from "zod";

import { DRAFT_TYPES, STUDIO_SLOT_TYPES } from "../../enums";
import { toZodEnum } from "../../utils";

const leagueSessionSettingsDraftObj = z
  .object({
    conduct: z.boolean().default(true),
    complete: z.boolean().default(false),
    date: z.date().optional(),
    hour: z.string().optional(),
    min: z.string().optional(),
    ampm: z.string().optional(),
    type: z.enum(toZodEnum(DRAFT_TYPES)).optional(),
    order: z
      .array(z.string())
      .optional()
      .refine((items) => items && new Set(items).size === items.length, {
        message: "Invalid draft order",
      }),
    numRounds: z.coerce.number().optional(),
    timePerRound: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.conduct) {
      const requiredFields = ["date", "hour", "min", "ampm", "type", "order", "numRounds", "timePerRound"];
      requiredFields.forEach((field) => {
        if (data[field as keyof typeof data] == null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required when conduct is true`,
          });
        }
      });
    }
  });
export type LeagueSessionSettingsDraft = z.infer<typeof leagueSessionSettingsDraftObj>;

const leagueSessionSettingsObj = z.object({
  draft: leagueSessionSettingsDraftObj,
  teamStructure: z.array(
    z.object({
      type: z.enum(toZodEnum(STUDIO_SLOT_TYPES)),
      pos: z.number(),
    }),
  ),
});
export type LeagueSessionSettings = z.infer<typeof leagueSessionSettingsObj>;

export const createLeagueSessionInputObj = z.object({
  leagueId: z.string(),
  name: z.string().min(2).max(50),
  startDate: z.date(),
  endDate: z.date(),
  settings: leagueSessionSettingsObj,
  memberIds: z.array(z.string()).optional(),
});

export const updateLeagueSessionInputObj = z.object({
  id: z.string(),
  leagueId: z.string(),
  name: z.string().min(2).max(50),
  startDate: z.date(),
  endDate: z.date(),
  settings: leagueSessionSettingsObj,
  memberIds: z.array(z.string()).optional(),
});

export const createLeagueSessionStudioObj = z.object({
  sessionId: z.string(),
  ownerId: z.string(),
  name: z.string().optional(),
});

export const makePickObj = z.object({
  sessionId: z.string(),
  studioId: z.string(),
  tmdbId: z.number(),
  title: z.string(),
  slot: z.number(),
});

export const logActivityObj = z.object({
  sessionId: z.string(),
  studioId: z.string().optional(),
  tmdbId: z.number().optional(),
  type: z.string(),
  message: z.string(),
});
