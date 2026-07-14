import type { SupabaseClient } from "@supabase/supabase-js"

interface EventData {
  concerts: Array<{ fecha: string; ciudad: string; sala: string; link: string | null }> | null
  festivals: Array<{ fecha: string; ciudad: string; sala: string; link: string | null }> | null
}

let eventsCache: { data: EventData; ts: number } | null = null
const EVENTS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getConcertsAndFestivals(supabase: SupabaseClient): Promise<EventData> {
  if (eventsCache && Date.now() - eventsCache.ts < EVENTS_CACHE_TTL) {
    return eventsCache.data
  }
  const [{ data: concerts }, { data: festivals }] = await Promise.all([
    supabase.from("concerts").select("fecha, ciudad, sala, link"),
    supabase.from("festis").select("fecha, ciudad, sala, link"),
  ])
  eventsCache = { data: { concerts, festivals }, ts: Date.now() }
  return { concerts, festivals }
}

export function buildDynamicContext(
  concerts: EventData["concerts"],
  festivals: EventData["festivals"],
): string {
  const fmt = (e: { fecha: string; ciudad: string; sala: string; link: string | null }) =>
    `${e.fecha} ${e.ciudad} ${e.sala}${e.link ? ` [entradas: ${e.link}]` : ""}`
  const parts: string[] = []
  if (concerts && concerts.length > 0) {
    parts.push("Proximos conciertos: " + concerts.map(fmt).join(" | "))
  }
  if (festivals && festivals.length > 0) {
    parts.push("Proximos festis: " + festivals.map(fmt).join(" | "))
  }
  if (parts.length === 0) return ""
  parts.push("Si preguntan por entradas de un concierto o festi, pasa su link. Si el link no cabe en tu respuesta corta, manda a somosbesmaya.com")
  return `[Info actualizada]\n${parts.join("\n")}\n[Fin info]\n\n`
}
