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
 * Las fechas se guardan sin año ("13-ago"), así que hay que inferirlo.
 *
 * Cada fecha se interpreta como la única ocurrencia que cae dentro de la
 * ventana de 12 meses que empieza PAST_GRACE_DAYS antes de hoy. Con eso:
 *   - un evento recién pasado sigue contando como pasado, así que
 *     filterPastEvents lo oculta y el cron diario lo borra;
 *   - una gira anunciada con hasta ~10 meses de antelación cae en el año
 *     correcto en vez de resolverse al año en curso, que ya habría pasado.
 *
 * El margen tiene que ser bastante mayor que el periodo del cron (diario) para
 * que nunca se le escape una fila, pero mucho menor que un año para que las
 * fechas lejanas sigan resolviéndose hacia adelante.
 */
const PAST_GRACE_DAYS = 60

function resolveYear(month: number, day: number, today: Date): number {
  const windowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - PAST_GRACE_DAYS)
  const year = windowStart.getFullYear()
  // Si con el año de inicio de ventana la fecha queda antes de la ventana,
  // pertenece a la vuelta siguiente del calendario.
  return new Date(year, month, day) < windowStart ? year + 1 : year
}

/**
 * Parse Spanish date formats to Date object (uses start date for ranges).
 * El año no viene en el dato: se infiere con resolveYear.
 * Supported formats:
 *   "17 feb"        → single date
 *   "30-ene"        → single date (hyphen separator)
 *   "31 jul - 1 ago" → date range across months (uses 31 jul)
 *   "1 - 2 ago"     → date range within same month (uses 1 ago)
 *
 * @param today Punto de referencia para inferir el año. Solo para tests;
 *              por defecto la fecha actual.
 */
export function parseFechaToDate(fecha: string, today: Date = new Date()): Date {
  const trimmed = fecha.trim().toLowerCase()
  const build = (day: number, month: number) => new Date(resolveYear(month, day, today), month, day)

  // Try range with two months: "31 jul - 1 ago"
  const rangeTwo = trimmed.match(/^(\d{1,2})\s+([a-z]+)\s*-\s*\d{1,2}\s+[a-z]+$/)
  if (rangeTwo) {
    const day = Number.parseInt(rangeTwo[1], 10)
    const month = MONTH_MAP[rangeTwo[2]]
    if (!isNaN(day) && month !== undefined) return build(day, month)
  }

  // Try range within same month: "1 - 2 ago"
  const rangeSame = trimmed.match(/^(\d{1,2})\s*-\s*\d{1,2}\s+([a-z]+)$/)
  if (rangeSame) {
    const day = Number.parseInt(rangeSame[1], 10)
    const month = MONTH_MAP[rangeSame[2]]
    if (!isNaN(day) && month !== undefined) return build(day, month)
  }

  // Simple format: "17 feb" or "30-ene"
  const simple = trimmed.match(/^(\d{1,2})[\s-]+([a-z]+)$/)
  if (simple) {
    const day = Number.parseInt(simple[1], 10)
    const month = MONTH_MAP[simple[2]]
    if (!isNaN(day) && month !== undefined) return build(day, month)
  }

  // Formato no reconocido: se devuelve "ahora", que es posterior a la medianoche
  // de hoy. Así la fila se sigue mostrando y el cron NO la borra: un error de
  // tecleo se arregla a mano, no perdiendo el dato.
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
