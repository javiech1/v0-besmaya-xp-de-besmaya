import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { eventDate } from "@/lib/cache"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Los bolos pasados ya NO se borran al pasar: la pagina los sigue mostrando
  // atenuados. Solo se purga lo de hace mas de un ano, para que las tablas no
  // crezcan sin limite (~30 bolos al ano).
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setFullYear(cutoff.getFullYear() - 1)

  const deleted: Record<string, number> = { concerts: 0, festivals: 0, muro_comments: 0 }

  const { data: concerts } = await supabase.from("concerts").select("id, fecha, created_at")
  if (concerts) {
    const staleIds = concerts
      .filter((c) => eventDate(c) < cutoff)
      .map((c) => c.id)

    if (staleIds.length > 0) {
      const { error } = await supabase.from("concerts").delete().in("id", staleIds)
      if (!error) deleted.concerts = staleIds.length
    }
  }

  const { data: festivals } = await supabase.from("festis").select("id, fecha, created_at")
  if (festivals) {
    const staleIds = festivals
      .filter((f) => eventDate(f) < cutoff)
      .map((f) => f.id)

    if (staleIds.length > 0) {
      const { error } = await supabase.from("festis").delete().in("id", staleIds)
      if (!error) deleted.festivals = staleIds.length
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
