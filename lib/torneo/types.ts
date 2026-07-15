export type GamePhase = "start" | "playing" | "gameover"

export interface RankingEntry {
  alias: string
  score: number
}

// ---- Motor 2D (side-scroller estilo Chrome-dino) ----
// Los obstaculos son merch real de Besmaya (sprites recortados).
export type ObstacleKind = "charm" | "keychain" | "cd"

export interface Obstacle {
  x: number          // borde izquierdo, unidades de mundo
  y: number          // borde superior, unidades de mundo
  w: number
  h: number
  kind: ObstacleKind
}

export interface GameState {
  // Jugador
  playerX: number        // FIJO = PLAYER_X
  playerY: number        // borde superior; en el suelo => GROUND_Y - PLAYER_H
  vy: number
  isJumping: boolean

  // Mundo
  groundY: number        // = GROUND_Y (comodidad para el renderer)
  obstacles: Obstacle[]
  speed: number
  distance: number
  score: number          // floor(distance * SCORE_PER_UNIT)

  // Tiempo / spawn / input
  frameCount: number
  jumpBufferedUntil: number
  nextGap: number        // separacion (mundo) a esperar antes del proximo spawn

  // Cosmeticos (los muta step; el render solo los lee)
  groundOffset: number   // parallax del suelo
  cloudOffset: number    // parallax de nubes
  gameOverFlash: number  // contador de flash de game over (steps restantes)

  started: boolean       // false en idle "pulsa para empezar" (mundo congelado)
  isGameOver: boolean
}

// ---- Payload cliente -> servidor (solo alias + score) ----
export interface SubmitScorePayload {
  alias: string
  score: number
}

// ---- Respuesta servidor -> cliente ----
export interface SubmitScoreResponse {
  ranking?: RankingEntry[]
  playerRank?: number
  isChampion?: boolean
  merchCode?: string   // SOLO presente si isChampion
  storeUrl?: string    // SOLO presente si isChampion
  error?: string
}
