import { MAX_PLAUSIBLE_SCORE } from "./gameEngine"

// Validación a mano: el único input del jugador es {alias, score}, no
// justifica cargar zod (main la retiró de las dependencias en la limpieza).

export function validateAlias(raw: string): { alias?: string; error?: string } {
  const alias = raw.trim()
  if (alias.length === 0) return { error: "El alias no puede estar vacío" }
  if (alias.length > 20) return { error: "Máximo 20 caracteres" }
  return { alias }
}

export type ScoreSubmissionInput = { alias: string; score: number }

export function parseScoreSubmission(
  body: unknown,
): { ok: true; data: ScoreSubmissionInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Datos inválidos" }
  }
  const { alias: rawAlias, score } = body as { alias?: unknown; score?: unknown }
  if (typeof rawAlias !== "string") return { ok: false, error: "Datos inválidos" }
  const { alias, error } = validateAlias(rawAlias)
  if (!alias) return { ok: false, error: error! }
  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_PLAUSIBLE_SCORE
  ) {
    return { ok: false, error: "Puntuación inválida" }
  }
  return { ok: true, data: { alias, score } }
}
