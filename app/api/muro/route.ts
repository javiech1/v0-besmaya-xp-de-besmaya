import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { moderateContent, moderateLocal } from "@/lib/moderation"
import { generateNadieResponse, NADIE_FALLBACKS } from "@/lib/nadie"
import { getConcertsAndFestivals, buildDynamicContext } from "@/lib/eventCache"

const isDev = process.env.NODE_ENV === "development"

// Simple in-memory rate limiter: max requests per IP within a time window
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 5 // max 5 posts per minute per IP
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

// Clean stale entries periodically to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, RATE_LIMIT_WINDOW_MS)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("muro_comments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: "Error al cargar comentarios" }, { status: 500 })
  }

  return NextResponse.json(data ? [...data].reverse() : [])
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Demasiados mensajes. Espera un momento." }, { status: 429 })
  }

  const body = await request.json()
  const { username, content } = body as { username?: string; content?: string }

  if (!content || content.trim().length === 0 || content.trim().length > 140) {
    return NextResponse.json(
      { error: "El mensaje debe tener entre 1 y 140 caracteres" },
      { status: 400 }
    )
  }

  const trimmedContent = content.trim()
  const trimmedUsername = username?.trim() || ""
  const needsUsername = trimmedUsername.length === 0

  const originalContent = trimmedContent
  const displayUsername = trimmedUsername || "anónimo"

  let finalUsername = trimmedUsername || ("user" + Math.random().toString(36).slice(2, 6))
  let finalContent = trimmedContent

  const apiKey = process.env.ANTHROPIC_API_KEY
  const isNadie = finalUsername.toLowerCase() === "nadie"

  // Fetch contexto para Nadie: mensajes recientes + conciertos/festis (en paralelo)
  const supabase = getSupabase()
  const [{ data: recentMessages }, eventsData] = await Promise.all([
    supabase
      .from("muro_comments")
      .select("username, content, is_nadie")
      .order("created_at", { ascending: false })
      .limit(15),
    getConcertsAndFestivals(supabase),
  ])
  const nadieContext = (recentMessages || []).reverse()
  const dynamicContext = buildDynamicContext(eventsData.concerts, eventsData.festivals)

  // Ejecutar moderación y respuesta de Nadie EN PARALELO
  let nadieText: string | null = null

  if (apiKey) {
    const [moderationResult, nadieResult] = await Promise.allSettled([
      moderateContent(apiKey, trimmedUsername, trimmedContent, needsUsername),
      !isNadie ? generateNadieResponse(apiKey, originalContent, displayUsername, nadieContext, dynamicContext) : Promise.resolve(null),
    ])

    if (moderationResult.status === "fulfilled" && moderationResult.value) {
      if (moderationResult.value.username) finalUsername = moderationResult.value.username
      if (moderationResult.value.content) finalContent = moderationResult.value.content
    } else {
      // Fallback: si la API de moderación falla, aplicar filtro local
      finalContent = moderateLocal(finalContent)
      finalUsername = moderateLocal(finalUsername)
    }

    if (nadieResult.status === "fulfilled" && nadieResult.value) {
      nadieText = nadieResult.value
    } else if (nadieResult.status === "rejected") {
      console.error("[Nadie] Promise rejected:", nadieResult.reason)
    }
  }

  // Insertar comment del usuario
  const { data, error } = await supabase
    .from("muro_comments")
    .insert([{ username: finalUsername, content: finalContent, is_nadie: false }])
    .select()
    .single()

  if (error) {
    isDev && console.error("Error Supabase:", error.message)
    return NextResponse.json({ error: "Error al guardar el mensaje" }, { status: 500 })
  }

  // Fallback si Nadie no respondió
  if (!nadieText && !isNadie && apiKey) {
    nadieText = NADIE_FALLBACKS[Math.floor(Math.random() * NADIE_FALLBACKS.length)]
    isDev && console.log("[Nadie] Usando fallback:", nadieText)
  }

  // Moderar respuesta de Nadie antes de insertar (filtro local)
  if (nadieText) {
    nadieText = moderateLocal(nadieText)
  }

  // Insertar respuesta de Nadie
  let nadieReply = null
  if (nadieText) {
    try {
      let cleanText = nadieText.replace(/^(@\S+\s*)+/, "").trim()
      const prefix = `@${finalUsername} `
      const budget = 140 - prefix.length
      if (cleanText.length > budget) {
        cleanText = cleanText.slice(0, budget)
        const lastSpace = cleanText.lastIndexOf(' ')
        if (lastSpace > budget * 0.6) cleanText = cleanText.slice(0, lastSpace)
      }
      const nadieContent = prefix + cleanText
      const { data: nadieData, error: nadieError } = await supabase
        .from("muro_comments")
        .insert([{ username: "Nadie", content: nadieContent, is_nadie: true }])
        .select()
        .single()

      if (!nadieError && nadieData) {
        nadieReply = nadieData
        isDev && console.log("[Nadie] Insertado en DB OK, id:", nadieData.id)
      } else if (nadieError) {
        console.error("[Nadie] Error insert Supabase:", nadieError.message)
      }
    } catch (err) {
      console.error("[Nadie] Error insertando (catch):", err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ userComment: data, nadieReply })
}
