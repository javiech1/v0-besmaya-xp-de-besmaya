// Coordinates for Spanish cities where concerts might be held
const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  "valencia": { lat: 39.4699, lon: -0.3763 },
  "zaragoza": { lat: 41.6488, lon: -0.8891 },
  "a coruña": { lat: 43.3623, lon: -8.4115 },
  "coruña": { lat: 43.3623, lon: -8.4115 },
  "oviedo": { lat: 43.3614, lon: -5.8493 },
  "madrid": { lat: 40.4168, lon: -3.7038 },
  "murcia": { lat: 37.9922, lon: -1.1307 },
  "granada": { lat: 37.1773, lon: -3.5986 },
  "córdoba": { lat: 37.8882, lon: -4.7794 },
  "cordoba": { lat: 37.8882, lon: -4.7794 },
  "pamplona": { lat: 42.8125, lon: -1.6458 },
  "valladolid": { lat: 41.6523, lon: -4.7245 },
  "barcelona": { lat: 41.3874, lon: 2.1686 },
  "sevilla": { lat: 37.3891, lon: -5.9845 },
  "bilbao": { lat: 43.2630, lon: -2.9350 },
  "málaga": { lat: 36.7213, lon: -4.4214 },
  "malaga": { lat: 36.7213, lon: -4.4214 },
  "alicante": { lat: 38.3452, lon: -0.4810 },
  "san sebastián": { lat: 43.3183, lon: -1.9812 },
  "san sebastian": { lat: 43.3183, lon: -1.9812 },
  "donostia": { lat: 43.3183, lon: -1.9812 },
  "santander": { lat: 43.4623, lon: -3.8100 },
  "salamanca": { lat: 40.9701, lon: -5.6635 },
  "vitoria": { lat: 42.8467, lon: -2.6726 },
  "león": { lat: 42.5987, lon: -5.5671 },
  "leon": { lat: 42.5987, lon: -5.5671 },
  "gijón": { lat: 43.5322, lon: -5.6611 },
  "gijon": { lat: 43.5322, lon: -5.6611 },
  "vigo": { lat: 42.2406, lon: -8.7207 },
  "santiago de compostela": { lat: 42.8782, lon: -8.5448 },
  "burgos": { lat: 42.3440, lon: -3.6969 },
  "castellón": { lat: 39.9864, lon: -0.0513 },
  "castellon": { lat: 39.9864, lon: -0.0513 },
  "almería": { lat: 36.8340, lon: -2.4637 },
  "almeria": { lat: 36.8340, lon: -2.4637 },
  "logroño": { lat: 42.4627, lon: -2.4445 },
  "logrono": { lat: 42.4627, lon: -2.4445 },
  "cádiz": { lat: 36.5271, lon: -6.2886 },
  "cadiz": { lat: 36.5271, lon: -6.2886 },
  "huelva": { lat: 37.2614, lon: -6.9447 },
  "jaén": { lat: 37.7796, lon: -3.7849 },
  "jaen": { lat: 37.7796, lon: -3.7849 },
  "toledo": { lat: 39.8628, lon: -4.0273 },
  "badajoz": { lat: 38.8794, lon: -6.9707 },
  "palma de mallorca": { lat: 39.5696, lon: 2.6502 },
  "palma": { lat: 39.5696, lon: 2.6502 },
  "las palmas": { lat: 28.1235, lon: -15.4363 },
  "tenerife": { lat: 28.4636, lon: -16.2518 },
  "santa cruz de tenerife": { lat: 28.4636, lon: -16.2518 },
  "lugo": { lat: 43.0097, lon: -7.5560 },
  "ourense": { lat: 42.3358, lon: -7.8639 },
  "pontevedra": { lat: 42.4310, lon: -8.6446 },
  "tarragona": { lat: 41.1189, lon: 1.2445 },
  "lleida": { lat: 41.6176, lon: 0.6200 },
  "girona": { lat: 41.9794, lon: 2.8214 },
  "huesca": { lat: 42.1401, lon: -0.4089 },
  "teruel": { lat: 40.3456, lon: -1.1065 },
  "soria": { lat: 41.7636, lon: -2.4649 },
  "segovia": { lat: 40.9429, lon: -4.1088 },
  "ávila": { lat: 40.6565, lon: -4.6818 },
  "avila": { lat: 40.6565, lon: -4.6818 },
  "cuenca": { lat: 40.0704, lon: -2.1374 },
  "guadalajara": { lat: 40.6337, lon: -3.1674 },
  "ciudad real": { lat: 38.9848, lon: -3.9274 },
  "albacete": { lat: 38.9943, lon: -1.8585 },
  "cáceres": { lat: 39.4753, lon: -6.3724 },
  "caceres": { lat: 39.4753, lon: -6.3724 },
  "mérida": { lat: 38.9160, lon: -6.3437 },
  "merida": { lat: 38.9160, lon: -6.3437 },
  "zamora": { lat: 41.5034, lon: -5.7467 },
  "palencia": { lat: 42.0096, lon: -4.5288 },
}

/**
 * Calculate distance between two coordinates using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Get coordinates for a city name (case-insensitive).
 */
function getCityCoordinates(city: string): { lat: number; lon: number } | null {
  const normalized = city.toLowerCase().trim()
  return CITY_COORDINATES[normalized] || null
}

/**
 * Find ALL concerts within a given radius from the user's position.
 * Returns results sorted by distance (closest first).
 */
export function findAllNearbyConcerts<T extends { ciudad: string }>(
  userLat: number,
  userLon: number,
  concerts: T[],
  radiusKm: number = 100
): { concert: T; distance: number }[] {
  const results: { concert: T; distance: number }[] = []

  for (const concert of concerts) {
    const coords = getCityCoordinates(concert.ciudad)
    if (!coords) continue

    const distance = haversineDistance(userLat, userLon, coords.lat, coords.lon)
    if (distance <= radiusKm) {
      results.push({ concert, distance })
    }
  }

  return results.sort((a, b) => a.distance - b.distance)
}

/**
 * Get user's location using IP geolocation (no browser permission prompt).
 * 1. Server-side IP geolocation (Vercel headers + ipwho.is fallback) — fast, works well on WiFi
 * 2. Client-side IP geolocation (direct call to ipwho.is from the browser) — works better on
 *    mobile data because the service sees the actual carrier IP instead of Vercel's edge IP
 */
export async function getUserLocation(): Promise<{ lat: number; lon: number }> {
  // 1. Try server-side IP geolocation first (Vercel headers — fastest)
  try {
    const res = await fetch('/api/geo')
    if (res.ok) {
      const data = await res.json()
      if (data.lat !== null && data.lon !== null) {
        return { lat: data.lat, lon: data.lon }
      }
    }
  } catch {
    // Server geo failed, try client-side fallback
  }

  // 2. Fallback: call IP geolocation directly from the browser.
  //    On mobile data, Vercel headers/proxy may lose the real carrier IP.
  //    Calling ipwho.is directly lets the service see the actual client IP.
  try {
    const res = await fetch('https://ipwho.is/', {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.latitude && data.longitude) {
        return { lat: data.latitude, lon: data.longitude }
      }
    }
  } catch {
    // Client-side IP geo failed
  }

  // 3. Try ipapi.co as a second client-side fallback (different IP database, HTTPS)
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return { lat: data.latitude, lon: data.longitude }
      }
    }
  } catch {
    // Second fallback also failed
  }

  throw new Error('Location not available')
}

/**
 * Check browser geolocation permission state without triggering a prompt.
 * Returns 'granted', 'prompt', or 'denied'.
 */
export async function checkGeolocationPermission(): Promise<'granted' | 'prompt' | 'denied'> {
  if (typeof navigator === 'undefined' || !navigator.permissions) return 'denied'
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state as 'granted' | 'prompt' | 'denied'
  } catch {
    return 'prompt' // Assume prompt if Permissions API not supported
  }
}

/**
 * Get location using the browser Geolocation API (GPS).
 * This WILL trigger a permission prompt if not already granted.
 */
export function getBrowserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation API not available'))
    }
    const timeout = setTimeout(() => reject(new Error('Browser geolocation timed out')), 10000)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout)
        resolve({ lat: position.coords.latitude, lon: position.coords.longitude })
      },
      (error) => {
        clearTimeout(timeout)
        reject(new Error(`Browser geolocation failed: ${error.message}`))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  })
}
