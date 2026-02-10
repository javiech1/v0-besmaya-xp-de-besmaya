import type { SupabaseClient } from "@supabase/supabase-js"

interface EventData {
  concerts: Array<{ fecha: string; ciudad: string; sala: string }> | null
  festivals: Array<{ fecha: string; ciudad: string; sala: string }> | null
}

let eventsCache: { data: EventData; ts: number } | null = null
const EVENTS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getConcertsAndFestivals(supabase: SupabaseClient): Promise<EventData> {
  if (eventsCache && Date.now() - eventsCache.ts < EVENTS_CACHE_TTL) {
    return eventsCache.data
  }
  const [{ data: concerts }, { data: festivals }] = await Promise.all([
    supabase.from("concerts").select("fecha, ciudad, sala"),
    supabase.from("festis").select("fecha, ciudad, sala"),
  ])
  eventsCache = { data: { concerts, festivals }, ts: Date.now() }
  return { concerts, festivals }
}

export function buildDynamicContext(
  concerts: EventData["concerts"],
  festivals: EventData["festivals"],
): string {
  const parts: string[] = []
  if (concerts && concerts.length > 0) {
    parts.push("Proximos conciertos: " + concerts.map(c => `${c.fecha} ${c.ciudad} ${c.sala}`).join(" | "))
  }
  if (festivals && festivals.length > 0) {
    parts.push("Proximos festis: " + festivals.map(f => `${f.fecha} ${f.ciudad} ${f.sala}`).join(" | "))
  }
  return parts.length > 0 ? `[Info actualizada]\n${parts.join("\n")}\n[Fin info]\n\n` : ""
}
