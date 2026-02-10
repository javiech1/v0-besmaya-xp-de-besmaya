import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

const concertSchema = z.object({
  fecha: z.string().min(1).max(50),
  ciudad: z.string().min(1).max(100),
  sala: z.string().min(1).max(100),
  link: z.string().url().max(500).or(z.literal("")),
})

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === "authenticated"
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.from("concerts").select("*").order("fecha", { ascending: true })

  if (error) {
    return NextResponse.json({ error: "Error al obtener conciertos" }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = concertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const supabase = getSupabase()
  const { error } = await supabase.from("concerts").insert([parsed.data])

  if (error) {
    return NextResponse.json({ error: "Error al crear concierto" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...updates } = body
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  }

  const parsed = concertSchema.partial().safeParse(updates)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const supabase = getSupabase()
  const { error } = await supabase.from("concerts").update(parsed.data).eq("id", id)

  if (error) {
    return NextResponse.json({ error: "Error al actualizar concierto" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await request.json()
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  }

  const supabase = getSupabase()
  const { error } = await supabase.from("concerts").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: "Error al eliminar concierto" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
