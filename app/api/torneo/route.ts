import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { scoreSubmissionSchema } from "@/lib/torneo/validation"
import type { RankingEntry } from "@/lib/torneo/types"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 3
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

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, RATE_LIMIT_WINDOW_MS)

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getRanking(supabase: ReturnType<typeof getServiceSupabase>): Promise<RankingEntry[]> {
  const { data } = await supabase
    .from("game_scores")
    .select("alias, score")
    .order("score", { ascending: false })
    .limit(10)
  return (data as RankingEntry[]) || []
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento." },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 })
  }

  const parsed = scoreSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Datos inválidos" },
      { status: 400 }
    )
  }

  const { alias, score, email, concert_id, confirm } = parsed.data

  const supabase = getServiceSupabase()

  // Check if email already exists
  const { data: existing } = await supabase
    .from("game_scores")
    .select("alias, concert_id, concerts(fecha, ciudad)")
    .eq("email", email)
    .maybeSingle()

  if (existing && !confirm) {
    const concertRaw = existing.concerts
    const concert = (Array.isArray(concertRaw) ? concertRaw[0] : concertRaw) as { fecha: string; ciudad: string } | null
    return NextResponse.json({
      existing: true,
      previousAlias: existing.alias,
      previousFecha: concert?.fecha || "",
      previousCiudad: concert?.ciudad || "",
    })
  }

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from("game_scores")
      .update({ alias, score, concert_id })
      .eq("email", email)

    if (error) {
      return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
    }
  } else {
    // Insert new record
    const { error } = await supabase
      .from("game_scores")
      .insert({ alias, score, email, concert_id })

    if (error) {
      return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
    }
  }

  const ranking = await getRanking(supabase)
  return NextResponse.json({ ranking })
}
