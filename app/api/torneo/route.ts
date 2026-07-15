import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@supabase/supabase-js"
import { parseScoreSubmission } from "@/lib/torneo/validation"
import { TORNEO_CODE_SCORE } from "@/lib/torneo/gameEngine"
import type { RankingEntry } from "@/lib/torneo/types"

export const dynamic = "force-dynamic"

// El codigo de descuento vive SOLO en el servidor: nunca se incluye en el
// bundle cliente; solo viaja en la respuesta cuando hay record real.
const MERCH_CODE = process.env.TORNEO_MERCH_CODE || "ACQ-STORE/BESMAYA"
const STORE_URL =
  process.env.TORNEO_STORE_URL || "https://acqustic-platform.sumupstore.com/categoria/besmaya"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}
// Nota: el reset perezoso de arriba ya libera las entradas caducadas al
// reaccederlas; no hace falta un setInterval de barrido (anti-patron/fuga en
// serverless, donde la instancia se congela). El rate limit es best-effort
// por instancia: util contra spam, NO una frontera de seguridad real.

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getRanking(supabase: ReturnType<typeof getServiceSupabase>): Promise<RankingEntry[]> {
  const { data } = await supabase
    .from("game_scores")
    .select("alias, score")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10)
  return (data as RankingEntry[]) || []
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 })
  }

  const parsed = parseScoreSubmission(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { alias, score } = parsed.data
  const supabase = getServiceSupabase()

  // Ganador = alcanzar el umbral de puntos. Regla simple y predecible:
  // no depende de quien sea el nº1 ni de cuando juegues.
  const isChampion = score >= TORNEO_CODE_SCORE

  // El esquema heredado de game_scores exige email NOT NULL UNIQUE. Insertamos un
  // email sintético único para que el guardado funcione sobre el esquema ACTUAL,
  // sin necesidad de migración DDL. (scripts/004 deja email opcional como limpieza
  // posterior; mientras tanto este valor es inofensivo y nunca se expone.)
  const { error: insertError } = await supabase
    .from("game_scores")
    .insert({ alias, score, email: `${randomUUID()}@nadie.local` })
  if (insertError) {
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }

  // Posicion del jugador = nº de filas con score >= el suyo. Como su fila recien
  // insertada queda la ULTIMA entre empatados (desempate created_at ASC), este
  // conteo coincide exactamente con la posicion que ocupa en el ranking mostrado.
  const { count } = await supabase
    .from("game_scores")
    .select("*", { count: "exact", head: true })
    .gte("score", score)
  const playerRank = count ?? 1

  const ranking = await getRanking(supabase)

  if (isChampion) {
    return NextResponse.json({
      ranking,
      playerRank,
      isChampion: true,
      merchCode: MERCH_CODE,
      storeUrl: STORE_URL,
    })
  }

  return NextResponse.json({ ranking, playerRank, isChampion: false })
}
