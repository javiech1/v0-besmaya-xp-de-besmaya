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
 * Parse Spanish date formats to Date object (uses start date for ranges).
 * Supported formats:
 *   "17 feb"        → single date
 *   "30-ene"        → single date (hyphen separator)
 *   "31 jul - 1 ago" → date range across months (uses 31 jul)
 *   "1 - 2 ago"     → date range within same month (uses 1 ago)
 */
export function parseFechaToDate(fecha: string): Date {
  const trimmed = fecha.trim().toLowerCase()

  // Try range with two months: "31 jul - 1 ago"
  const rangeTwo = trimmed.match(/^(\d{1,2})\s+([a-z]+)\s*-\s*\d{1,2}\s+[a-z]+$/)
  if (rangeTwo) {
    const day = Number.parseInt(rangeTwo[1], 10)
    const month = MONTH_MAP[rangeTwo[2]]
    if (!isNaN(day) && month !== undefined) return new Date(2026, month, day)
  }

  // Try range within same month: "1 - 2 ago"
  const rangeSame = trimmed.match(/^(\d{1,2})\s*-\s*\d{1,2}\s+([a-z]+)$/)
  if (rangeSame) {
    const day = Number.parseInt(rangeSame[1], 10)
    const month = MONTH_MAP[rangeSame[2]]
    if (!isNaN(day) && month !== undefined) return new Date(2026, month, day)
  }

  // Simple format: "17 feb" or "30-ene"
  const simple = trimmed.match(/^(\d{1,2})[\s-]+([a-z]+)$/)
  if (simple) {
    const day = Number.parseInt(simple[1], 10)
    const month = MONTH_MAP[simple[2]]
    if (!isNaN(day) && month !== undefined) return new Date(2026, month, day)
  }

  return new Date()
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
