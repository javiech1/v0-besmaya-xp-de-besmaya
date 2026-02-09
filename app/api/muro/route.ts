import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

  // Intentar moderar con Claude Haiku via fetch directo
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
    try {
      const systemPrompt = `Eres un moderador de contenido y generador de usernames. Tu tarea es:

1. ${needsUsername ? "Genera un username aleatorio y divertido de EXACTAMENTE 6 caracteres (letras minúsculas y/o números). Sé creativo." : `Modera el username proporcionado "${trimmedUsername}": si contiene cualquier palabra ofensiva, taco o insulto, reemplaza CADA palabra ofensiva por asteriscos (*) del mismo número de caracteres. Si no contiene nada ofensivo, devuélvelo tal cual.`}

2. Modera el siguiente mensaje con TOLERANCIA CERO. Censura SIEMPRE cualquier palabra ofensiva, taco, palabrota o palabra que pueda usarse como insulto, SIN IMPORTAR EL CONTEXTO. No hay excepciones — aunque la frase sea positiva, la palabra ofensiva se censura igualmente. Solo reemplaza la palabra ofensiva por asteriscos (*) del mismo número de caracteres, dejando el resto de la frase intacto.

Palabras que SIEMPRE se censuran (lista no exhaustiva):
- Tacos/palabrotas: polla, puta, hostia, joder, coño, mierda, culo, cojones, capullo, gilipollas, cabrón, cabrona, hijoputa, follar, puto
- Insultos: maricón, marica, bollera, travelo, sidoso, subnormal, retrasado, mongolo, zorra, guarra
- Palabras ambiguas que pueden ser insulto: gay, gordo, gorda, feo, fea, negro, negra, enano, enana, trans, lesbiana
- Equivalentes en inglés: fuck, shit, bitch, faggot, retard, nigger, cunt, dick, ass, whore

Ejemplos:
- "es la polla" → "es la *****"
- "de puta madre" → "de **** madre"
- "gay" → "***"
- "me cago en la hostia" → "me cago en la ******"
- "eres gordo" → "eres *****"
- "vuestro disco mola" → "vuestro disco mola" (sin cambios)

3. Además de palabrotas, censura también CUALQUIER contenido políticamente incorrecto o inapropiado para un muro público. Esto incluye pero no se limita a:
- Apología del fascismo, nazismo, franquismo o cualquier dictadura
- Lemas, consignas o referencias a movimientos de odio (ej: "arriba españa", "viva franco", "heil hitler", "sieg heil", etc.)
- Discurso de odio, racismo, xenofobia, homofobia, transfobia, misoginia
- Referencias a violencia, terrorismo o amenazas
- Contenido sexual explícito
- Acoso o ataques personales
- Usernames que sean nombres de dictadores o figuras de odio usados como apología (ej: "franco", "hitler", "mussolini" → censurar con asteriscos)
Aplica el mismo criterio: reemplaza las palabras/frases problemáticas con asteriscos (*) del mismo número de caracteres.

En caso de duda, CENSURA. Es mejor censurar de más que de menos. Aplica en español e inglés.

Responde SOLO con un JSON válido con este formato exacto, sin markdown ni explicaciones:
{"username": "...", "content": "..."}`

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: needsUsername
                ? `Mensaje a moderar: "${trimmedContent}"`
                : `Username: "${trimmedUsername}" | Mensaje: "${trimmedContent}"`,
            },
          ],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const textBlock = data.content?.find((b: { type: string }) => b.type === "text")
        if (textBlock?.text) {
          let rawText = textBlock.text.trim()
          rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
          const parsed = JSON.parse(rawText)
          if (parsed.username) finalUsername = parsed.username.slice(0, 20)
          if (parsed.content) finalContent = parsed.content.slice(0, 140)
        }
      } else {
        console.error("Anthropic API error:", res.status, await res.text())
      }
    } catch (err) {
      console.error("Error de moderación (usando fallback):", err instanceof Error ? err.message : err)
    }
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
