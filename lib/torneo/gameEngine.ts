import type { GameState, Obstacle, ObstacleKind } from "./types"

// ---- Dimensiones del mundo (unidades logicas, proporcion dino 3:1) ----
export const WORLD_W = 600
export const WORLD_H = 200
export const GROUND_Y = 170
export const PLAYER_X = 60
export const PLAYER_W = 22
export const PLAYER_H = 34

export const FIXED_DT = 1000 / 60
export const MAX_PLAUSIBLE_SCORE = 100000

// ---- Fisica del salto ----
const GRAVITY = 0.45
const JUMP_VY = -8.4
const MAX_FALL_VY = 13

// ---- Velocidad / dificultad ----
const BASE_SPEED = 3.2
const MAX_SPEED = 7.0
const SPEED_INCREMENT = 0.0018
const SCORE_PER_UNIT = 0.1

// ---- Spawn de obstaculos ----
const SAFE_GAP_FACTOR = 1.15
const GAP_RANDOM_RANGE = 140
// Duracion (en steps) de un salto completo: subida + bajada.
const JUMP_DURATION_STEPS = (2 * Math.abs(JUMP_VY)) / GRAVITY // ~37
const JUMP_BUFFER_STEPS = 6
const WALLET_UNLOCK_DIST = 1600

// ---- Colision (hitbox un poco mas pequena que el sprite: perdon-friendly) ----
const PLAYER_HITBOX_INSET = 4
const OBST_HITBOX_INSET = 3

// ---- Parallax del suelo ----
export const GROUND_TILE = 28

interface ObstacleDef {
  w: number
  h: number
  yOffset: number // separacion del suelo (0 = apoyado); el bird vuela bajo
}

// Dimensiones (mundo) ajustadas al aspecto de cada sprite de merch, con alturas
// siempre saltables (apex del salto ~78u libra cualquier top >= ~92u).
const OBSTACLE_DEFS: Record<ObstacleKind, ObstacleDef> = {
  charm: { w: 14, h: 48, yOffset: 0 },     // figura amarilla de Nadie (alto/fino)
  keychain: { w: 12, h: 50, yOffset: 0 },  // llavero besmaya (alto/fino)
  wallet: { w: 60, h: 34, yOffset: 0 },    // cartera + llavero (ancho/bajo)
}

export function createInitialState(): GameState {
  return {
    playerX: PLAYER_X,
    playerY: GROUND_Y - PLAYER_H,
    vy: 0,
    isJumping: false,
    groundY: GROUND_Y,
    obstacles: [],
    speed: BASE_SPEED,
    distance: 0,
    score: 0,
    frameCount: 0,
    jumpBufferedUntil: 0,
    nextGap: 0,
    groundOffset: 0,
    cloudOffset: 0,
    gameOverFlash: 0,
    started: false,
    isGameOver: false,
  }
}

export function makeObstacle(kind: ObstacleKind, x: number): Obstacle {
  const d = OBSTACLE_DEFS[kind]
  return { x, y: GROUND_Y - (d.yOffset + d.h), w: d.w, h: d.h, kind }
}

function minGap(speed: number): number {
  return speed * JUMP_DURATION_STEPS * SAFE_GAP_FACTOR + PLAYER_W
}

function randomGap(speed: number): number {
  return minGap(speed) + Math.random() * GAP_RANDOM_RANGE
}

function pickKind(distance: number): ObstacleKind {
  // La cartera (ancha, mas dificil) se desbloquea al avanzar.
  if (distance > WALLET_UNLOCK_DIST && Math.random() < 0.3) return "wallet"
  return Math.random() < 0.5 ? "charm" : "keychain"
}

function collides(state: GameState): boolean {
  const px1 = state.playerX + PLAYER_HITBOX_INSET
  const px2 = state.playerX + PLAYER_W - PLAYER_HITBOX_INSET
  const py1 = state.playerY + PLAYER_HITBOX_INSET
  const py2 = state.playerY + PLAYER_H - PLAYER_HITBOX_INSET

  const obs = state.obstacles
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i]
    // Descarta rapido los que no estan cerca del jugador en X.
    if (o.x > px2 || o.x + o.w < px1) continue
    const ox1 = o.x + OBST_HITBOX_INSET
    const ox2 = o.x + o.w - OBST_HITBOX_INSET
    const oy1 = o.y + OBST_HITBOX_INSET
    const oy2 = o.y + o.h - OBST_HITBOX_INSET
    if (px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1) return true
  }
  return false
}

/**
 * Avanza 1 step (1/60 s). MUTA `state` in-place y devuelve el mismo ref.
 * Cero asignaciones por frame salvo el objeto Obstacle ocasional en cada spawn.
 */
export function step(state: GameState): GameState {
  if (state.isGameOver) {
    if (state.gameOverFlash > 0) state.gameOverFlash--
    return state
  }

  state.frameCount++

  // Idle: el mundo no avanza hasta el primer salto. frameCount sigue para el
  // parpadeo del mensaje "pulsa para empezar".
  if (!state.started) return state

  // --- Dificultad / distancia / score ---
  state.speed = Math.min(state.speed + SPEED_INCREMENT, MAX_SPEED)
  state.distance += state.speed
  state.score = Math.floor(state.distance * SCORE_PER_UNIT)

  // --- Parallax ---
  state.groundOffset = (state.groundOffset + state.speed) % GROUND_TILE
  state.cloudOffset += state.speed * 0.15 // el render envuelve

  // --- Fisica vertical ---
  state.vy = Math.min(state.vy + GRAVITY, MAX_FALL_VY)
  state.playerY += state.vy

  const floorY = GROUND_Y - PLAYER_H
  let justLanded = false
  if (state.playerY >= floorY) {
    state.playerY = floorY
    justLanded = state.isJumping && state.vy > 0
    state.vy = 0
    state.isJumping = false
  }

  // Buffer de salto: si se pulso justo antes de aterrizar, salta al tocar suelo.
  if (justLanded && state.frameCount <= state.jumpBufferedUntil) {
    state.vy = JUMP_VY
    state.isJumping = true
    state.jumpBufferedUntil = 0
  }

  // --- Mover obstaculos (bucle, sin map/filter) ---
  const obs = state.obstacles
  for (let i = 0; i < obs.length; i++) {
    obs[i].x -= state.speed
  }
  // Eliminar los que salieron por la izquierda (mantiene el orden por x).
  while (obs.length > 0 && obs[0].x + obs[0].w < -10) {
    obs.shift()
  }

  // --- Spawn por separacion (gap fijado una vez por spawn, no por frame) ---
  const last = obs.length > 0 ? obs[obs.length - 1] : null
  if (!last || last.x + last.w < WORLD_W - state.nextGap) {
    obs.push(makeObstacle(pickKind(state.distance), WORLD_W))
    state.nextGap = randomGap(state.speed)
  }

  // --- Colision ---
  if (collides(state)) {
    state.isGameOver = true
    state.gameOverFlash = 8
  }

  return state
}

/** Salta o bufferiza si esta en el aire. MUTA in-place. Arranca el mundo. */
export function jump(state: GameState): GameState {
  if (state.isGameOver) return state
  if (!state.started) state.started = true // arranca el mundo en el primer salto
  if (!state.isJumping) {
    state.vy = JUMP_VY
    state.isJumping = true
  } else {
    state.jumpBufferedUntil = state.frameCount + JUMP_BUFFER_STEPS
  }
  return state
}
