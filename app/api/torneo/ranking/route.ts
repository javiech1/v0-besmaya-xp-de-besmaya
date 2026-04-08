import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { RankingEntry } from "@/lib/torneo/types"

export const dynamic = "force-dynamic"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("game_scores")
    .select("alias, score")
    .order("score", { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: "Error al obtener ranking" }, { status: 500 })
  }

  return NextResponse.json((data as RankingEntry[]) || [])
}
