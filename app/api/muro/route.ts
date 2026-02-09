import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("muro_comments")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
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

  // Intentar moderar con Claude Haiku
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const systemPrompt = `Eres un moderador de contenido y generador de usernames. Tu tarea es:

1. ${needsUsername ? "Genera un username aleatorio y divertido de EXACTAMENTE 6 caracteres (letras minúsculas y/o números). Sé creativo." : `Modera el username proporcionado "${trimmedUsername}": si contiene tacos, palabrotas, insultos o lenguaje ofensivo, reemplaza las palabras ofensivas por asteriscos (*) del mismo número de caracteres. Si no contiene nada ofensivo, devuélvelo tal cual.`}

2. Modera el siguiente mensaje: revisa si contiene tacos, palabrotas, insultos o lenguaje ofensivo en español (y también en inglés). Si encuentras alguna palabra ofensiva, reemplázala por asteriscos (*) del mismo número de caracteres que la palabra original. Si el mensaje no contiene nada ofensivo, devuélvelo tal cual.

Responde SOLO con un JSON válido con este formato exacto, sin markdown ni explicaciones:
{"username": "...", "content": "..."}`

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: needsUsername
            ? `Mensaje a moderar: "${trimmedContent}"`
            : `Username: "${trimmedUsername}" | Mensaje: "${trimmedContent}"`,
        },
      ],
      system: systemPrompt,
    })

    const textBlock = response.content.find((block) => block.type === "text")
    if (textBlock && textBlock.type === "text") {
      let rawText = textBlock.text.trim()
      rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
      const parsed = JSON.parse(rawText)
      if (parsed.username) finalUsername = parsed.username.slice(0, 20)
      if (parsed.content) finalContent = parsed.content.slice(0, 140)
    }
  } catch (err) {
    console.error("Error de moderación (usando fallback):", err instanceof Error ? err.message : err)
  }

  // Insertar en Supabase
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("muro_comments")
    .insert([{ username: finalUsername, content: finalContent }])
    .select()
    .single()

  if (error) {
    console.error("Error Supabase:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
