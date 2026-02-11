import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // 1. Try Vercel IP geolocation headers (fastest, no external call)
  const lat = request.headers.get('x-vercel-ip-latitude')
  const lon = request.headers.get('x-vercel-ip-longitude')

  if (lat && lon) {
    const parsedLat = parseFloat(lat)
    const parsedLon = parseFloat(lon)

    if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
      return NextResponse.json({ lat: parsedLat, lon: parsedLon })
    }
  }

  // 2. Fallback: use client IP with external geolocation service
  const forwardedFor = request.headers.get('x-forwarded-for')
  const clientIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip')

  if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
    try {
      const geoRes = await fetch(`https://ipwho.is/${clientIp}`, {
        signal: AbortSignal.timeout(3000),
      })
      if (geoRes.ok) {
        const geoData = await geoRes.json()
        if (geoData.success && geoData.latitude && geoData.longitude) {
          return NextResponse.json({ lat: geoData.latitude, lon: geoData.longitude })
        }
      }
    } catch {
      // External geolocation service failed or timed out
    }
  }

  return NextResponse.json({ lat: null, lon: null })
}
