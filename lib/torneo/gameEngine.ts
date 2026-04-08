import type { GameState, Obstacle } from "./types"

const NUM_LANES = 5
const BASE_SPEED = 0.006
const MAX_SPEED = 0.022
const SPEED_INCREMENT = 0.00004
const SPAWN_INTERVAL_BASE = 80   // frames between spawns
const SPAWN_INTERVAL_MIN = 35
const COLLISION_Z_THRESHOLD = 0.82
const PLAYER_LERP = 0.18

const OBSTACLE_TYPES: Obstacle["type"][] = ["error_dialog", "bsod", "papelera"]

export function createInitialState(): GameState {
  return {
    playerLane: 2,
    playerTargetLane: 2,
    playerX: 0.5, // relative 0-1 across canvas width
    obstacles: [],
    score: 0,
    speed: BASE_SPEED,
    frameCount: 0,
    isGameOver: false,
    lastObstacleFrame: 0,
  }
}

function getLaneRelativeX(lane: number): number {
  // Returns 0-1 value for a given lane (0-4)
  // Evenly distributed, leaving margins on sides
  return 0.12 + (lane / (NUM_LANES - 1)) * 0.76
}

export function tick(state: GameState): GameState {
  if (state.isGameOver) return state

  const frameCount = state.frameCount + 1
  const score = state.score + 1
  const speed = Math.min(state.speed + SPEED_INCREMENT, MAX_SPEED)

  // Smooth player X position
  const targetX = getLaneRelativeX(state.playerTargetLane)
  const playerX = state.playerX + (targetX - state.playerX) * PLAYER_LERP

  // Update obstacles depth
  let obstacles = state.obstacles
    .map((o) => ({ ...o, z: o.z + speed }))
    .filter((o) => o.z < 1.15)

  // Collision detection
  let isGameOver = false
  for (const obs of obstacles) {
    if (obs.z >= COLLISION_Z_THRESHOLD && obs.lane === state.playerTargetLane) {
      isGameOver = true
      break
    }
  }

  // Spawn new obstacles
  const spawnInterval = Math.max(
    SPAWN_INTERVAL_MIN,
    SPAWN_INTERVAL_BASE - Math.floor(score / 300) * 5
  )

  if (frameCount - state.lastObstacleFrame >= spawnInterval && !isGameOver) {
    const count = score > 1000 ? 2 : 1
    const usedLanes = new Set<number>()
    const newObs: Obstacle[] = []

    for (let i = 0; i < count; i++) {
      // Pick a lane that guarantees at least 2 free lanes always
      let attempts = 0
      let lane: number
      do {
        lane = Math.floor(Math.random() * NUM_LANES)
        attempts++
      } while (usedLanes.has(lane) && attempts < 10)

      // Don't block more than 3 lanes at once (always leave 2 free)
      if (usedLanes.size < 3) {
        usedLanes.add(lane)
        newObs.push({
          lane,
          z: 0,
          type: OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)],
        })
      }
    }

    obstacles = [...obstacles, ...newObs]
  }

  return {
    ...state,
    playerX,
    obstacles,
    score,
    speed,
    frameCount,
    isGameOver,
    lastObstacleFrame:
      frameCount - state.lastObstacleFrame >= spawnInterval
        ? frameCount
        : state.lastObstacleFrame,
  }
}

export function moveLeft(state: GameState): GameState {
  return {
    ...state,
    playerTargetLane: Math.max(0, state.playerTargetLane - 1),
  }
}

export function moveRight(state: GameState): GameState {
  return {
    ...state,
    playerTargetLane: Math.min(NUM_LANES - 1, state.playerTargetLane + 1),
  }
}

// ---- Renderer ----

const XP_BLUE_DARK = "#0A246A"
const XP_BLUE_MID = "#1C54C2"
const XP_BLUE_LIGHT = "#3A78D4"
const XP_GRAY = "#D4D0C8"
const XP_GRAY_DARK = "#A09898"
const XP_GREEN_FLOOR = "#2D6A2D"
const PLAYER_COLOR = "#FF6600"

function getObstacleColors(type: Obstacle["type"]): { fill: string; title: string; text: string } {
  switch (type) {
    case "error_dialog":
      return { fill: "#ECE9D8", title: "#D4380A", text: "#000000" }
    case "bsod":
      return { fill: "#0000AA", title: "#0000AA", text: "#FFFFFF" }
    case "papelera":
      return { fill: "#ECE9D8", title: "#0A246A", text: "#000000" }
  }
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)

  const horizonY = h * 0.28
  const vpX = w * 0.5  // vanishing point X

  // ---- SKY / CEILING ----
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY)
  skyGrad.addColorStop(0, XP_BLUE_DARK)
  skyGrad.addColorStop(1, XP_BLUE_LIGHT)
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, w, horizonY)

  // ---- FLOOR ----
  const floorGrad = ctx.createLinearGradient(0, horizonY, 0, h)
  floorGrad.addColorStop(0, XP_GRAY_DARK)
  floorGrad.addColorStop(1, XP_GRAY)
  ctx.fillStyle = floorGrad
  ctx.fillRect(0, horizonY, w, h - horizonY)

  // Floor grid lines (perspective)
  ctx.strokeStyle = "rgba(0,0,0,0.15)"
  ctx.lineWidth = 1
  const NUM_GRID_LINES = 10
  for (let i = 1; i <= NUM_GRID_LINES; i++) {
    const t = i / NUM_GRID_LINES
    const y = horizonY + (h - horizonY) * t
    // horizontal
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // Floor lane lines (perspective)
  ctx.strokeStyle = "rgba(0,0,0,0.2)"
  for (let lane = 0; lane <= 5; lane++) {
    const relX = 0.12 + (lane / 5) * 0.76
    const bottomX = w * relX
    ctx.beginPath()
    ctx.moveTo(vpX, horizonY)
    ctx.lineTo(bottomX, h)
    ctx.stroke()
  }

  // ---- WALLS ----
  // Left wall
  ctx.strokeStyle = XP_BLUE_MID
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(vpX, horizonY)
  ctx.lineTo(0, h)
  ctx.stroke()

  // Right wall
  ctx.beginPath()
  ctx.moveTo(vpX, horizonY)
  ctx.lineTo(w, h)
  ctx.stroke()

  // Horizon line
  ctx.strokeStyle = XP_BLUE_DARK
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, horizonY)
  ctx.lineTo(w, horizonY)
  ctx.stroke()

  // ---- OBSTACLES ----
  // Sort so closer (higher z) renders on top
  const sorted = [...state.obstacles].sort((a, b) => a.z - b.z)

  for (const obs of sorted) {
    const z = obs.z
    const screenY = horizonY + (h - horizonY) * z
    const laneRelX = getLaneRelativeX(obs.lane)
    const screenX = vpX + (laneRelX * w - vpX) * z

    const obsW = Math.max(8, 50 * z)
    const obsH = Math.max(6, 38 * z)

    const colors = getObstacleColors(obs.type)

    if (obs.type === "bsod") {
      // Blue screen block
      ctx.fillStyle = colors.fill
      ctx.fillRect(screenX - obsW / 2, screenY - obsH, obsW, obsH)
      if (obsW > 20) {
        ctx.fillStyle = colors.text
        ctx.font = `bold ${Math.max(4, 7 * z)}px Tahoma, sans-serif`
        ctx.textAlign = "center"
        ctx.fillText(":(", screenX, screenY - obsH * 0.3)
      }
    } else if (obs.type === "error_dialog") {
      // Error dialog box
      ctx.fillStyle = colors.fill
      ctx.fillRect(screenX - obsW / 2, screenY - obsH, obsW, obsH)
      ctx.strokeStyle = "#888"
      ctx.lineWidth = Math.max(0.5, z)
      ctx.strokeRect(screenX - obsW / 2, screenY - obsH, obsW, obsH)
      // title bar
      ctx.fillStyle = colors.title
      ctx.fillRect(screenX - obsW / 2, screenY - obsH, obsW, obsH * 0.3)
      if (obsW > 25) {
        ctx.fillStyle = "#FFF"
        ctx.font = `${Math.max(3, 5 * z)}px Tahoma, sans-serif`
        ctx.textAlign = "center"
        ctx.fillText("Error", screenX, screenY - obsH * 0.75)
      }
    } else {
      // Papelera (recycle bin) - simplified icon
      ctx.fillStyle = colors.fill
      ctx.fillRect(screenX - obsW / 2, screenY - obsH, obsW, obsH)
      ctx.strokeStyle = "#666"
      ctx.lineWidth = Math.max(0.5, z)
      ctx.strokeRect(screenX - obsW / 2, screenY - obsH, obsW, obsH)
      if (obsW > 20) {
        ctx.fillStyle = "#333"
        ctx.font = `${Math.max(5, 10 * z)}px Tahoma, sans-serif`
        ctx.textAlign = "center"
        ctx.fillText("🗑", screenX, screenY - obsH * 0.2)
      }
    }
  }

  // ---- PLAYER ----
  const playerScreenX = vpX + (state.playerX * w - vpX) * 0.92
  const playerY = h - h * 0.08
  const pW = 28
  const pH = 36

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)"
  ctx.ellipse(playerScreenX, playerY + 4, pW * 0.5, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body
  ctx.fillStyle = PLAYER_COLOR
  ctx.fillRect(playerScreenX - pW / 2, playerY - pH, pW, pH)

  // XP-style border
  ctx.strokeStyle = "#7A2F00"
  ctx.lineWidth = 1.5
  ctx.strokeRect(playerScreenX - pW / 2, playerY - pH, pW, pH)

  // Label
  ctx.fillStyle = "#FFF"
  ctx.font = "bold 7px Tahoma, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("NADIE", playerScreenX, playerY - pH / 2 + 3)

  // ---- HUD ----
  ctx.textAlign = "right"
  ctx.font = "bold 14px Tahoma, sans-serif"
  ctx.fillStyle = "#000"
  ctx.fillText(`${state.score}`, w - 11, 21)
  ctx.fillStyle = "#FFF"
  ctx.fillText(`${state.score}`, w - 12, 20)

  ctx.textAlign = "left"
  ctx.font = "bold 11px Tahoma, sans-serif"
  ctx.fillStyle = "#000"
  ctx.fillText("SCORE", 11, 21)
  ctx.fillStyle = "#FFF"
  ctx.fillText("SCORE", 10, 20)
}
