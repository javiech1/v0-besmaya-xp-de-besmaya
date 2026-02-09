const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export function getFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const { data, timestamp }: CacheEntry<T> = JSON.parse(cached)
    if (Date.now() - timestamp < CACHE_DURATION_MS) {
      return data
    }
    return null
  } catch {
    return null
  }
}

export function setToCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch {
    // Ignore storage errors
  }
}

// Spanish month abbreviation to month number mapping
const MONTH_MAP: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
}

/**
 * Parse Spanish date format "DD-mmm" (e.g., "30-ene") to Date object
 */
export function parseFechaToDate(fecha: string): Date {
  const parts = fecha.split(/[-\s]+/)
  if (parts.length !== 2) return new Date()

  const day = Number.parseInt(parts[0], 10)
  const month = MONTH_MAP[parts[1].toLowerCase()]

  if (isNaN(day) || month === undefined) return new Date()

  return new Date(2026, month, day)
}

/**
 * Generic sort function for items with a "fecha" field in Spanish format
 */
export function sortByFechaChronologically<T extends { fecha: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dateA = parseFechaToDate(a.fecha)
    const dateB = parseFechaToDate(b.fecha)
    return dateA.getTime() - dateB.getTime()
  })
}
