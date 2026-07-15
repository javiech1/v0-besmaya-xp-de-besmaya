import type { GameState, Obstacle, ObstacleKind } from "./types"

// ---- Dimensiones del mundo (unidades logicas, proporcion dino 3:1) ----
export const WORLD_W = 600
export const WORLD_H = 200
export const GROUND_Y = 170
export const PLAYER_X = 60
export const PLAYER_W = 22
export const PLAYER_H = 34

export const FIXED_DT = 1000 / 60
// Tope duro del torneo: a los 7000 puntos la partida termina si o si.
// Doble funcion: nadie se eterniza jugando, y el server puede rechazar
// como imposible cualquier score por encima (anti-trampas).
export const HARD_CAP_SCORE = 7000
export const MAX_PLAUSIBLE_SCORE = HARD_CAP_SCORE

// ---- Fisica del salto ----
const GRAVITY = 0.45
const JUMP_VY = -8.4
const MAX_FALL_VY = 13

// ---- Velocidad / dificultad ----
const BASE_SPEED = 3.2
const MAX_SPEED = 8.0
const SPEED_INCREMENT = 0.0018
const SCORE_PER_UNIT = 0.1

// El codigo de merch cae al llegar a esta puntuacion (el server usa el mismo
// umbral para decidir si la respuesta incluye el codigo).
export const TORNEO_CODE_SCORE = 1000

// ---- Spawn de obstaculos ----
// El margen de seguridad de los gaps se estrecha progresivamente en el
// endgame: la velocidad toca techo hacia score ~1500, y a partir de ahi la
// dificultad sigue subiendo por reaccion (menos aire entre clusters) hasta
// score ~2500. Siempre > 1: el gap nunca baja de lo fisicamente saltable.
const GAP_FACTOR_START = 1.15
const GAP_FACTOR_MIN = 1.05
const GAP_TIGHTEN_FROM = 10000 // distancia (score 1000)
const GAP_TIGHTEN_SPAN = 15000 // hasta 25000 (score 2500)
const GAP_RANDOM_RANGE = 220
// Duracion (en steps) de un salto completo: subida + bajada.
const JUMP_DURATION_STEPS = (2 * Math.abs(JUMP_VY)) / GRAVITY // ~37
const JUMP_BUFFER_STEPS = 6
// Desbloqueo progresivo: primero llaveros sueltos, luego parejas, luego
// tríos y el CD. Los grupos rompen el ritmo fijo de "un salto por obstaculo".
const PAIR_UNLOCK_DIST = 700
const TRIPLE_UNLOCK_DIST = 1400
const CD_UNLOCK_DIST = 1600
// Separacion entre piezas de un grupo (se salta el grupo entero de una vez).
// Jugabilidad: el trio mas ancho (3x14 + 2x7 = 56u) + jugador (22u) cabe de
// sobra en el tramo del salto que libra 50u de altura (~72u a velocidad base,
// ~85u a la velocidad tipica de cuando se desbloquea).
const INTRA_GROUP_GAP = 7

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
  charm: { w: 14, h: 48, yOffset: 0 },     // Llavero Nadie (figura amarilla, alto/fino)
  keychain: { w: 12, h: 50, yOffset: 0 },  // Llavero Logo besmaya (alto/fino)
  cd: { w: 46, h: 42, yOffset: 0 },        // CD "La vida de Nadie" (disco, mas ancho)
  camiseta: { w: 42, h: 47, yOffset: 0 },  // Camiseta besmaya (ancha y alta, la mas grande)
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

function gapFactor(distance: number): number {
  if (distance <= GAP_TIGHTEN_FROM) return GAP_FACTOR_START
  const t = Math.min(1, (distance - GAP_TIGHTEN_FROM) / GAP_TIGHTEN_SPAN)
  return GAP_FACTOR_START - (GAP_FACTOR_START - GAP_FACTOR_MIN) * t
}

function minGap(speed: number, distance: number): number {
  return speed * JUMP_DURATION_STEPS * gapFactor(distance) + PLAYER_W
}

function randomGap(speed: number, distance: number): number {
  return minGap(speed, distance) + Math.random() * GAP_RANDOM_RANGE
}

// En el endgame los clusters grandes son mas frecuentes
const LATE_GAME_DIST = 12000 // score 1200

/**
 * Encola un "cluster" de obstaculos: el CD suelto, o 1-3 llaveros seguidos.
 * Los grupos se saltan enteros de una vez (ver INTRA_GROUP_GAP arriba).
 */
function spawnCluster(state: GameState): void {
  const d = state.distance
  const late = d > LATE_GAME_DIST
  // Merch "grande" suelto (CD o camiseta): se desbloquea al avanzar.
  if (d > CD_UNLOCK_DIST && Math.random() < (late ? 0.35 : 0.25)) {
    state.obstacles.push(makeObstacle(Math.random() < 0.5 ? "cd" : "camiseta", WORLD_W))
    return
  }
  let count = 1
  if (late) {
    const r = Math.random()
    count = r < 0.35 ? 1 : r < 0.7 ? 2 : 3
  } else if (d > TRIPLE_UNLOCK_DIST) {
    const r = Math.random()
    count = r < 0.5 ? 1 : r < 0.82 ? 2 : 3
  } else if (d > PAIR_UNLOCK_DIST) {
    count = Math.random() < 0.65 ? 1 : 2
  }
  let x = WORLD_W
  for (let i = 0; i < count; i++) {
    const kind: ObstacleKind = Math.random() < 0.5 ? "charm" : "keychain"
    state.obstacles.push(makeObstacle(kind, x))
    x += OBSTACLE_DEFS[kind].w + INTRA_GROUP_GAP
  }
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

  // Tope duro: a los 7000 se acabo la partida (ver HARD_CAP_SCORE)
  if (state.score >= HARD_CAP_SCORE) {
    state.score = HARD_CAP_SCORE
    state.isGameOver = true
    state.gameOverFlash = 8
    return state
  }

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
    spawnCluster(state)
    state.nextGap = randomGap(state.speed, state.distance)
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
