import { z } from "zod"
import { MAX_PLAUSIBLE_SCORE } from "./gameEngine"

export const aliasSchema = z.object({
  alias: z
    .string()
    .trim()
    .min(1, "El alias no puede estar vacío")
    .max(20, "Máximo 20 caracteres"),
})

export const scoreSubmissionSchema = z.object({
  alias: z
    .string()
    .trim()
    .min(1, "El alias no puede estar vacío")
    .max(20, "Máximo 20 caracteres"),
  score: z.number().int().min(0).max(MAX_PLAUSIBLE_SCORE),
})

export type AliasInput = z.infer<typeof aliasSchema>
export type ScoreSubmissionInput = z.infer<typeof scoreSubmissionSchema>
