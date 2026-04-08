export type GamePhase = "start" | "playing" | "gameover"

export interface RankingEntry {
  alias: string
  score: number
}

export interface Concert {
  id: string
  ciudad: string
  sala: string
  fecha: string
}

// Game engine types
export interface Obstacle {
  lane: number   // 0-4
  z: number      // 0 = horizon, 1 = player position
  type: "error_dialog" | "bsod" | "papelera"
}

export interface GameState {
  playerLane: number
  playerTargetLane: number
  playerX: number        // actual rendered X (smooth lerp)
  obstacles: Obstacle[]
  score: number
  speed: number
  frameCount: number
  isGameOver: boolean
  lastObstacleFrame: number
}

export interface SubmitScorePayload {
  alias: string
  score: number
  email: string
  concert_id: string
  confirm?: boolean
}

export interface SubmitScoreResponse {
  existing?: boolean
  previousAlias?: string
  previousFecha?: string
  previousCiudad?: string
  ranking?: RankingEntry[]
  error?: string
}
