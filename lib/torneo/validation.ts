import { z } from "zod"

export const aliasSchema = z.object({
  alias: z
    .string()
    .min(1, "El alias no puede estar vacío")
    .max(20, "Máximo 20 caracteres"),
})

export const scoreSubmissionSchema = z.object({
  alias: z
    .string()
    .min(1, "El alias no puede estar vacío")
    .max(20, "Máximo 20 caracteres"),
  score: z
    .number()
    .int()
    .min(0)
    .max(999999),
  email: z.string().email("Email no válido"),
  concert_id: z.string().uuid("Selecciona un concierto"),
  confirm: z.boolean().optional(),
})

export type AliasInput = z.infer<typeof aliasSchema>
export type ScoreSubmissionInput = z.infer<typeof scoreSubmissionSchema>
