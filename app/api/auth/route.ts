import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    if (password === ADMIN_PASSWORD) {
      const cookieStore = await cookies()
      cookieStore.set("admin_session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")

  return NextResponse.json({
    authenticated: session?.value === "authenticated",
  })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")

  return NextResponse.json({ success: true })
}
