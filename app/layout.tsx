import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
}

export const metadata: Metadata = {
  title: "Besmaya - Web Oficial",
  description: "Web oficial de la banda Besmaya",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  return (
    <html lang="en">
      {supabaseOrigin && (
        <head>
          {/* El muro habla con Supabase (queries + Realtime) nada mas cargar: adelantar el handshake */}
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
        </head>
      )}
      {/* Tahoma es fuente de sistema: no existe en Google Fonts, el link solo bloqueaba el render */}
      <body style={{ fontFamily: "Tahoma, sans-serif" }}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
