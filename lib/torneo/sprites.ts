import type { ObstacleKind } from "./types"

// Sprites de merch real (recortados) servidos desde /public/torneo.
const SOURCES: Record<ObstacleKind, string> = {
  charm: "/torneo/charm.png",
  keychain: "/torneo/keychain.png",
  cd: "/torneo/cd.png",
  camiseta: "/torneo/camiseta.png",
}

const cache: Partial<Record<ObstacleKind, HTMLImageElement>> = {}
let started = false

/** Precarga los sprites (idempotente, solo en cliente). Llamar al montar el juego. */
export function loadSprites(): void {
  if (started || typeof window === "undefined") return
  started = true
  for (const kind of Object.keys(SOURCES) as ObstacleKind[]) {
    const img = new Image()
    img.decoding = "async"
    img.src = SOURCES[kind]
    cache[kind] = img
  }
}

/** Devuelve el sprite si ya esta cargado y es valido; si no, null (el render hace fallback). */
export function getSprite(kind: ObstacleKind): HTMLImageElement | null {
  const img = cache[kind]
  if (img && img.complete && img.naturalWidth > 0) return img
  return null
}
