import type { GameState, Obstacle } from "./types"
import { WORLD_W, WORLD_H, GROUND_Y, PLAYER_W, PLAYER_H, GROUND_TILE } from "./gameEngine"
import { getSprite } from "./sprites"

// ---- Paleta ----
const NADIE_FILL = "#FFC81E"
const NADIE_SHADE = "#E2A100"
const NADIE_LIGHT = "#FFE383"
const NADIE_OUTLINE = "#9A6B00"

const SKY_TOP = "#2E6FCC"
const SKY_MID = "#5C97DD"
const SKY_BOT = "#C6DEF5"
const HILL_BACK = "#9ACB66"
const HILL_FRONT = "#6FB23F"
const GRASS = "#7CB24A"
const DIRT = "#CDB98A"
const GROUND_LINE = "#5E8A36"
const GROUND_MARK = "rgba(60,90,30,0.35)"
const CLOUD = "rgba(255,255,255,0.92)"

const HUD_DARK = "#15233f"
const HUD_LIGHT = "#FFFFFF"

const FONT_SCORE = "bold 16px Tahoma, sans-serif"
const FONT_SMALL = "11px Tahoma, sans-serif"
const FONT_MSG = "bold 14px Tahoma, sans-serif"
const FONT_SUB = "11px Tahoma, sans-serif"
const FONT_GG = "bold 20px Tahoma, sans-serif"

export interface BgCache {
  canvas: HTMLCanvasElement
  w: number
  h: number
}

interface Layout {
  scale: number
  offX: number
  groundScreenY: number
}

function computeLayout(W: number, H: number): Layout {
  // Escala uniforme (sin deformar el sprite). El suelo se ancla abajo (~82%)
  // para que haya cielo amplio arriba: aspecto de runner, no banda centrada.
  const scale = Math.min(W / WORLD_W, H / WORLD_H)
  const offX = (W - WORLD_W * scale) / 2
  let groundScreenY = H * 0.82
  const minG = 120 * scale // deja sitio arriba para el apex del salto
  if (groundScreenY < minG) groundScreenY = minG
  if (groundScreenY > H - 6) groundScreenY = H - 6
  return { scale, offX, groundScreenY }
}

// Cache del layout: solo cambia en resize.
let _lw = -1
let _lh = -1
let _layout: Layout | null = null
function getLayout(W: number, H: number): Layout {
  if (W !== _lw || H !== _lh || !_layout) {
    _layout = computeLayout(W, H)
    _lw = W
    _lh = H
  }
  return _layout
}

// Cache de strings del HUD.
let _lastScore = -1
let _scoreStr = "00000"
let _lastHi = -1
let _hiStr = ""

/** Coordenada Y de mundo -> pantalla (el suelo del mundo queda en groundScreenY). */
function wY(lay: Layout, worldY: number): number {
  return lay.groundScreenY - (GROUND_Y - worldY) * lay.scale
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  const anyCtx = ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }
  ctx.beginPath()
  if (typeof anyCtx.roundRect === "function") {
    anyCtx.roundRect(x, y, w, h, rr)
    return
  }
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const r = 12 * s
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.arc(cx + r * 1.2, cy + r * 0.25, r * 0.85, 0, Math.PI * 2)
  ctx.arc(cx - r * 1.1, cy + r * 0.3, r * 0.75, 0, Math.PI * 2)
  ctx.arc(cx + r * 0.1, cy - r * 0.55, r * 0.78, 0, Math.PI * 2)
  ctx.fill()
}

function hills(ctx: CanvasRenderingContext2D, W: number, baseY: number, amp: number, period: number, phase: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, baseY + amp)
  for (let x = 0; x <= W; x += 8) {
    const y = baseY - amp * 0.5 * (1 + Math.sin((x / period) * Math.PI * 2 + phase))
    ctx.lineTo(x, y)
  }
  ctx.lineTo(W, baseY + amp)
  ctx.closePath()
  ctx.fill()
}

/** Fondo estatico (cielo + colinas + suelo). Recrear solo en resize. */
export function buildBackground(cssW: number, cssH: number, dpr: number): BgCache {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(cssW * dpr))
  canvas.height = Math.max(1, Math.round(cssH * dpr))
  const ctx = canvas.getContext("2d")
  if (!ctx) return { canvas, w: cssW, h: cssH }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const lay = computeLayout(cssW, cssH)
  const gy = lay.groundScreenY

  // Cielo
  const sky = ctx.createLinearGradient(0, 0, 0, gy + 1)
  sky.addColorStop(0, SKY_TOP)
  sky.addColorStop(0.55, SKY_MID)
  sky.addColorStop(1, SKY_BOT)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, cssW, gy)

  // Brillo de sol suave
  const sun = ctx.createRadialGradient(cssW * 0.8, gy * 0.25, 4, cssW * 0.8, gy * 0.25, gy * 0.5)
  sun.addColorStop(0, "rgba(255,255,235,0.55)")
  sun.addColorStop(1, "rgba(255,255,235,0)")
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, cssW, gy)

  // Colinas (2 capas)
  hills(ctx, cssW, gy + 2, 26 * lay.scale, cssW * 0.9, 0.6, HILL_BACK)
  hills(ctx, cssW, gy + 2, 16 * lay.scale, cssW * 0.55, 2.1, HILL_FRONT)

  // Franja de hierba + tierra
  ctx.fillStyle = GRASS
  ctx.fillRect(0, gy, cssW, Math.max(4, 6 * lay.scale))
  ctx.fillStyle = DIRT
  ctx.fillRect(0, gy + Math.max(4, 6 * lay.scale), cssW, cssH - gy)

  // Linea de suelo
  ctx.strokeStyle = GROUND_LINE
  ctx.lineWidth = Math.max(1.5, 2.2 * lay.scale)
  ctx.beginPath()
  ctx.moveTo(0, gy)
  ctx.lineTo(cssW, gy)
  ctx.stroke()

  return { canvas, w: cssW, h: cssH }
}

// ---------------------------------------------------------------------------

function drawObstacle(ctx: CanvasRenderingContext2D, lay: Layout, o: Obstacle) {
  const x = lay.offX + o.x * lay.scale
  const top = wY(lay, o.y)
  const w = o.w * lay.scale
  const h = o.h * lay.scale

  // Sombra al pie
  ctx.globalAlpha = 0.18
  ctx.fillStyle = "#000000"
  ctx.beginPath()
  ctx.ellipse(x + w / 2, lay.groundScreenY, Math.max(6, w * 0.55), 3 * lay.scale, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  const sprite = getSprite(o.kind)
  if (sprite) {
    ctx.drawImage(sprite, x, top, w, h)
    return
  }
  // Fallback mientras carga el sprite
  ctx.fillStyle = "#C9C6BD"
  roundRect(ctx, x, top, w, h, 3 * lay.scale)
  ctx.fill()
  ctx.strokeStyle = "#6E6B63"
  ctx.lineWidth = 1
  ctx.stroke()
}

function leg(ctx: CanvasRenderingContext2D, cx: number, top: number, len: number, wdt: number) {
  roundRect(ctx, cx - wdt / 2, top, wdt, len, wdt * 0.5)
  ctx.fill()
}

function drawNadie(ctx: CanvasRenderingContext2D, lay: Layout, state: GameState) {
  const scale = lay.scale
  const w = PLAYER_W * scale
  const h = PLAYER_H * scale
  const x = lay.offX + state.playerX * scale
  const topY = wY(lay, state.playerY)
  const cx = x + w / 2
  const feet = topY + h

  let pose: "idle" | "run" | "jump" | "dead" = "run"
  if (state.isGameOver) pose = "dead"
  else if (state.isJumping) pose = "jump"
  else if (!state.started) pose = "idle"

  // Sombra (se encoge con la altura)
  const airFrac = Math.max(0, Math.min(1, (lay.groundScreenY - feet) / (60 * scale)))
  ctx.globalAlpha = 0.16 * (1 - 0.45 * airFrac)
  ctx.fillStyle = "#000000"
  ctx.beginPath()
  ctx.ellipse(cx, lay.groundScreenY, w * (0.6 - 0.3 * airFrac), 3.2 * scale, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.save()
  if (pose === "jump") {
    ctx.translate(cx, topY + h / 2)
    ctx.rotate(-0.09)
    ctx.translate(-cx, -(topY + h / 2))
  } else if (pose === "dead") {
    ctx.translate(cx, topY + h / 2)
    ctx.rotate(0.42)
    ctx.translate(-cx, -(topY + h / 2))
  }

  const headR = w * 0.4
  const headCy = topY + headR * 0.98
  const bodyTop = headCy + headR * 0.5
  const bodyBot = topY + h * 0.7
  const bodyW = w * 0.96
  const bodyH = bodyBot - bodyTop
  const hipY = bodyBot
  const legLen = feet - hipY
  const legW = w * 0.26
  const sw = pose === "run" ? Math.sin(state.frameCount * 0.45) : 0
  const bob = pose === "run" ? Math.abs(Math.sin(state.frameCount * 0.45)) * -1.4 * scale : 0

  // Halo suave (aspecto peludo de la mascota)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = NADIE_LIGHT
  ctx.beginPath()
  ctx.arc(cx, headCy + bob, headR * 1.16, 0, Math.PI * 2)
  ctx.fill()
  roundRect(ctx, cx - bodyW * 0.56, bodyTop + bob, bodyW * 1.12, bodyH * 1.04, bodyW * 0.5)
  ctx.fill()
  ctx.globalAlpha = 1

  // Piernas (detras)
  ctx.fillStyle = NADIE_SHADE
  if (pose === "run") {
    leg(ctx, cx - w * 0.15 + sw * w * 0.17, hipY + bob, legLen * (0.96 - 0.12 * sw), legW)
    leg(ctx, cx + w * 0.15 - sw * w * 0.17, hipY + bob, legLen * (0.96 + 0.12 * sw), legW)
  } else if (pose === "jump") {
    leg(ctx, cx - w * 0.13, hipY - legLen * 0.18 + bob, legLen * 0.6, legW)
    leg(ctx, cx + w * 0.13, hipY - legLen * 0.05 + bob, legLen * 0.55, legW)
  } else {
    leg(ctx, cx - w * 0.14, hipY + bob, legLen, legW)
    leg(ctx, cx + w * 0.14, hipY + bob, legLen, legW)
  }

  // Cuerpo
  ctx.fillStyle = NADIE_FILL
  roundRect(ctx, cx - bodyW / 2, bodyTop + bob, bodyW, bodyH, bodyW * 0.42)
  ctx.fill()
  // Sombra inferior del cuerpo
  ctx.fillStyle = NADIE_SHADE
  roundRect(ctx, cx - bodyW / 2, bodyTop + bodyH * 0.6 + bob, bodyW, bodyH * 0.4, bodyW * 0.42)
  ctx.fill()
  // Brillo
  ctx.fillStyle = NADIE_LIGHT
  ctx.beginPath()
  ctx.ellipse(cx - bodyW * 0.2, bodyTop + bodyH * 0.3 + bob, bodyW * 0.2, bodyH * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()

  // Cabeza (sin cara)
  ctx.fillStyle = NADIE_FILL
  ctx.beginPath()
  ctx.arc(cx, headCy + bob, headR, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = NADIE_SHADE
  ctx.beginPath()
  ctx.arc(cx, headCy + bob, headR, 0.18 * Math.PI, 0.82 * Math.PI)
  ctx.fill()
  ctx.fillStyle = NADIE_LIGHT
  ctx.beginPath()
  ctx.ellipse(cx - headR * 0.32, headCy - headR * 0.3 + bob, headR * 0.3, headR * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()

  // Contorno sutil
  ctx.strokeStyle = NADIE_OUTLINE
  ctx.lineWidth = Math.max(1, 1.1 * scale)
  ctx.beginPath()
  ctx.arc(cx, headCy + bob, headR, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

/** Dibuja un frame. Puro: solo lee `state`. */
export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  bg: BgCache | null,
  hiScore: number,
) {
  const lay = getLayout(W, H)

  // 1) Fondo cacheado (cubre y "limpia")
  if (bg) {
    ctx.drawImage(bg.canvas, 0, 0, W, H)
  } else {
    ctx.fillStyle = SKY_BOT
    ctx.fillRect(0, 0, W, H)
  }

  // 2) Nubes parallax
  ctx.fillStyle = CLOUD
  const span = W + 140
  const cOff = state.cloudOffset % span
  for (let i = 0; i < 3; i++) {
    const cxp = W - ((cOff + i * (span / 3)) % span)
    drawCloud(ctx, cxp, lay.groundScreenY * (0.2 + i * 0.13), lay.scale * (0.55 + i * 0.13))
  }

  // 3) Marcas de suelo en movimiento (un solo stroke)
  ctx.strokeStyle = GROUND_MARK
  ctx.lineWidth = Math.max(1, 1.5 * lay.scale)
  ctx.beginPath()
  const tile = GROUND_TILE * lay.scale
  const startX = lay.offX - ((state.groundOffset * lay.scale) % tile)
  const my = lay.groundScreenY + 7 * lay.scale
  for (let gx = startX; gx < W; gx += tile) {
    ctx.moveTo(gx, my)
    ctx.lineTo(gx + tile * 0.45, my)
  }
  ctx.stroke()

  // 4) Obstaculos (merch)
  const obs = state.obstacles
  for (let i = 0; i < obs.length; i++) {
    const sx = lay.offX + obs[i].x * lay.scale
    if (sx > W + 60 || sx + obs[i].w * lay.scale < -60) continue
    drawObstacle(ctx, lay, obs[i])
  }

  // 5) Nadie
  drawNadie(ctx, lay, state)

  // 6) HUD
  ctx.textBaseline = "alphabetic"
  if (state.score !== _lastScore) {
    _lastScore = state.score
    _scoreStr = String(state.score).padStart(5, "0")
  }
  ctx.font = FONT_SCORE
  ctx.textAlign = "right"
  ctx.fillStyle = HUD_LIGHT
  ctx.fillText(_scoreStr, W - 9, 23)
  ctx.fillStyle = HUD_DARK
  ctx.fillText(_scoreStr, W - 10, 22)

  if (hiScore > 0) {
    if (hiScore !== _lastHi) {
      _lastHi = hiScore
      _hiStr = "HI " + String(hiScore).padStart(5, "0")
    }
    ctx.font = FONT_SMALL
    ctx.textAlign = "left"
    ctx.fillStyle = HUD_LIGHT
    ctx.fillText(_hiStr, 11, 21)
    ctx.fillStyle = "#3a4a6a"
    ctx.fillText(_hiStr, 10, 20)
  }

  // 7) Idle
  if (!state.started && !state.isGameOver) {
    ctx.textAlign = "center"
    if (Math.floor(state.frameCount / 32) % 2 === 0) {
      ctx.fillStyle = HUD_DARK
      ctx.font = FONT_MSG
      ctx.fillText("Pulsa ESPACIO o toca para empezar", W / 2, lay.groundScreenY - 56 * lay.scale)
    }
    ctx.fillStyle = "#1d2c4a"
    ctx.font = FONT_SUB
    ctx.fillText("Salta la merch de Besmaya", W / 2, lay.groundScreenY - 40 * lay.scale)
  }

  // 8) Game over (breve, antes de que React monte la pantalla)
  if (state.isGameOver) {
    if (state.gameOverFlash > 0) {
      ctx.globalAlpha = 0.5 * (state.gameOverFlash / 8)
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
    ctx.textAlign = "center"
    ctx.fillStyle = "#D4380A"
    ctx.font = FONT_GG
    ctx.fillText("GAME OVER", W / 2, H / 2 - 6)
    ctx.fillStyle = HUD_DARK
    ctx.font = FONT_SUB
    ctx.fillText("Puntuación: " + String(state.score).padStart(5, "0"), W / 2, H / 2 + 14)
  }
}
