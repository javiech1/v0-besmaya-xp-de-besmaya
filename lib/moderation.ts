const isDev = process.env.NODE_ENV === "development"

const MODERATION_SYSTEM_PROMPT = `Eres un moderador de contenido y generador de usernames. Recibirás instrucciones sobre el username en un mensaje aparte.

Modera el mensaje del usuario con TOLERANCIA CERO. Censura SIEMPRE cualquier palabra ofensiva, taco, palabrota o palabra que pueda usarse como insulto, SIN IMPORTAR EL CONTEXTO. No hay excepciones — aunque la frase sea positiva, la palabra ofensiva se censura igualmente. Solo reemplaza la palabra ofensiva por asteriscos (*) del mismo número de caracteres, dejando el resto de la frase intacto.

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

Además de palabrotas, censura también CUALQUIER contenido políticamente incorrecto o inapropiado para un muro público. Esto incluye pero no se limita a:
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

const BANNED_WORDS = [
  "polla", "puta", "hostia", "joder", "coño", "mierda", "culo", "cojones",
  "capullo", "gilipollas", "cabron", "cabrona", "hijoputa", "follar", "puto",
  "maricon", "marica", "bollera", "travelo", "sidoso", "subnormal", "retrasado",
  "mongolo", "zorra", "guarra",
  "fuck", "shit", "bitch", "faggot", "retard", "nigger", "cunt", "dick", "ass", "whore",
]

export function moderateLocal(text: string): string {
  let result = text
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    result = result.replace(regex, "*".repeat(word.length))
  }
  if (result !== text) {
    isDev && console.log("[Moderation] Local filter:", text, "→", result)
  }
  return result
}

export async function moderateContent(
  apiKey: string,
  trimmedUsername: string,
  trimmedContent: string,
  needsUsername: boolean
): Promise<{ username: string; content: string } | null> {
  const usernameInstruction = needsUsername
    ? "Para el campo username del JSON: genera un username aleatorio y divertido de EXACTAMENTE 6 caracteres (letras minúsculas y/o números). Sé creativo."
    : `Para el campo username del JSON: modera el username "${trimmedUsername}". Si contiene cualquier palabra ofensiva, taco o insulto, reemplaza CADA palabra ofensiva por asteriscos (*) del mismo número de caracteres. Si no contiene nada ofensivo, devuélvelo tal cual.`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
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
        system: [
          {
            type: "text",
            text: MODERATION_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: usernameInstruction,
          },
        ],
        messages: [
          {
            role: "user",
            content: needsUsername
              ? `Mensaje a moderar: "${trimmedContent}"`
              : `Username: "${trimmedUsername}" | Mensaje: "${trimmedContent}"`,
          },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      isDev && console.log("[Cache][Moderation]", { input: data.usage?.input_tokens, cache_read: data.usage?.cache_read_input_tokens, cache_creation: data.usage?.cache_creation_input_tokens })
      const textBlock = data.content?.find((b: { type: string }) => b.type === "text")
      if (textBlock?.text) {
        let rawText = textBlock.text.trim()
        rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
        const parsed = JSON.parse(rawText)
        return {
          username: parsed.username?.slice(0, 20) || "",
          content: parsed.content?.slice(0, 140) || "",
        }
      }
    } else {
      console.error("Anthropic API error (moderation):", res.status, await res.text())
    }
  } catch (err) {
    clearTimeout(timeoutId)
    console.error("Error de moderación:", err instanceof Error ? err.message : err)
  }

  return null
}
