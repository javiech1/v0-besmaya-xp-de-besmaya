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
 * Las fechas se guardan sin año ("13-ago"), así que hay que inferirlo a partir
 * de un punto de referencia: la fecha se resuelve a la única ocurrencia que
 * cae en la ventana de 12 meses que empieza GRACE_DAYS antes de esa referencia.
 *
 * La referencia buena es `created_at`, no "hoy" (ver `eventDate`). Anclar en
 * hoy hace imposible representar un bolo de hace más de GRACE_DAYS: se
 * empujaría al año siguiente y volvería a contar como próximo. Con `created_at`
 * la fecha queda fijada para siempre el día que se dio de alta la fila.
 *
 * El margen hacia atrás cubre el caso de meter un bolo el mismo día o justo
 * después de tocarlo; el resto de la ventana va hacia adelante, que es como se
 * anuncian las giras.
 */
const GRACE_DAYS = 30

function resolveYear(month: number, day: number, reference: Date): number {
  const windowStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - GRACE_DAYS)
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
 * @param reference Punto de referencia para inferir el año. Para eventos usa
 *                  `eventDate`, que pasa el `created_at` de la fila.
 */
export function parseFechaToDate(fecha: string, reference: Date = new Date()): Date {
  const trimmed = fecha.trim().toLowerCase()
  const build = (day: number, month: number) => new Date(resolveYear(month, day, reference), month, day)

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

/** Un evento tal y como vive en las tablas `concerts` / `festis`. */
export interface DatedEvent {
  fecha: string
  created_at?: string | null
}

/**
 * Fecha real de un evento, anclada en cuándo se dio de alta la fila.
 *
 * Es la forma correcta de fechar un evento: `created_at` no cambia, así que un
 * bolo de hace ocho meses se sigue resolviendo a su año de verdad y no
 * reaparece como próximo. Sin `created_at` (fila antigua o dato corrupto) se
 * cae a "ahora", que es el comportamiento de antes.
 */
export function eventDate(event: DatedEvent): Date {
  if (event.created_at) {
    const created = new Date(event.created_at)
    if (!isNaN(created.getTime())) return parseFechaToDate(event.fecha, created)
  }
  return parseFechaToDate(event.fecha)
}

/**
 * Generic sort function for items with a "fecha" field in Spanish format
 */
export function sortByFechaChronologically<T extends DatedEvent>(items: T[]): T[] {
  return [...items].sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime())
}
