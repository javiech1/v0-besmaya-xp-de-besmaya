import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { moderateContent, moderateLocal } from "@/lib/moderation"

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

  let finalUsername = trimmedUsername || ("user" + Math.random().toString(36).slice(2, 6))
  let finalContent = trimmedContent

  const apiKey = process.env.ANTHROPIC_API_KEY

  // Moderación bloquea: el comment del usuario no se publica hasta que se modera
  if (apiKey) {
    const moderation = await moderateContent(apiKey, trimmedUsername, trimmedContent, needsUsername)
    if (moderation) {
      if (moderation.username) finalUsername = moderation.username
      if (moderation.content) finalContent = moderation.content
    } else {
      finalContent = moderateLocal(finalContent)
      finalUsername = moderateLocal(finalUsername)
    }
  } else {
    finalContent = moderateLocal(finalContent)
    finalUsername = moderateLocal(finalUsername)
  }

  // Insert user comment. The Database Webhook on muro_comments fires the
  // Supabase Edge Function `nadie-processor`, which handles batching + reply.
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("muro_comments")
    .insert([{ username: finalUsername, content: finalContent, is_nadie: false }])
    .select()
    .single()

  if (error) {
    isDev && console.error("Error Supabase:", error.message)
    return NextResponse.json({ error: "Error al guardar el mensaje" }, { status: 500 })
  }

  return NextResponse.json({ userComment: data })
}
