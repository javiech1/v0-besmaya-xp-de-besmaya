import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseFechaToDate } from "@/lib/cache"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const deleted: Record<string, number> = { concerts: 0, festivals: 0, muro_comments: 0 }

  const { data: concerts } = await supabase.from("concerts").select("id, fecha")
  if (concerts) {
    const pastIds = concerts
      .filter((c) => parseFechaToDate(c.fecha) < today)
      .map((c) => c.id)

    if (pastIds.length > 0) {
      const { error } = await supabase.from("concerts").delete().in("id", pastIds)
      if (!error) deleted.concerts = pastIds.length
    }
  }

  const { data: festivals } = await supabase.from("festis").select("id, fecha")
  if (festivals) {
    const pastIds = festivals
      .filter((f) => parseFechaToDate(f.fecha) < today)
      .map((f) => f.id)

    if (pastIds.length > 0) {
      const { error } = await supabase.from("festis").delete().in("id", pastIds)
      if (!error) deleted.festivals = pastIds.length
    }
  }

  // Borrar comentarios del muro de más de 30 días
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: oldComments } = await supabase
    .from("muro_comments")
    .select("id")
    .lt("created_at", thirtyDaysAgo.toISOString())
  if (oldComments && oldComments.length > 0) {
    const oldIds = oldComments.map((c) => c.id)
    const { error: muroError } = await supabase.from("muro_comments").delete().in("id", oldIds)
    if (!muroError) deleted.muro_comments = oldIds.length
  }

  return NextResponse.json({ success: true, deleted })
}
