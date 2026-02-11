import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const lat = request.headers.get('x-vercel-ip-latitude')
  const lon = request.headers.get('x-vercel-ip-longitude')

  if (lat && lon) {
    const parsedLat = parseFloat(lat)
    const parsedLon = parseFloat(lon)

    if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
      return NextResponse.json({ lat: parsedLat, lon: parsedLon })
    }
  }

  return NextResponse.json({ lat: null, lon: null })
}
