"use client"

import { useEffect, useRef } from "react"
import { createInitialState, step, jump, FIXED_DT } from "@/lib/torneo/gameEngine"
import { render, buildBackground, type BgCache } from "@/lib/torneo/gameRenderer"
import { loadSprites } from "@/lib/torneo/sprites"
import type { GameState } from "@/lib/torneo/types"

interface TorneoGameProps {
  onGameOver: (score: number) => void
  /** false cuando la ventana XP esta minimizada/oculta: pausa el bucle. */
  isActive?: boolean
}

export function TorneoGame({ onGameOver, isActive = true }: TorneoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(createInitialState())
  const onGameOverRef = useRef(onGameOver)
  onGameOverRef.current = onGameOver

  const isActiveRef = useRef(isActive)
  const updateRunningRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    loadSprites() // precarga los sprites de merch (idempotente)
    stateRef.current = createInitialState()
    const hiRef = { current: 0 }
    try {
      hiRef.current = Number(localStorage.getItem("nadie_hi")) || 0
    } catch {
      hiRef.current = 0
    }

    let W = 0
    let H = 0
    let bg: BgCache | null = null
    let rafId = 0
    let acc = 0
    let last = 0
    let firedGameOver = false
    let goTimeout: ReturnType<typeof setTimeout> | null = null
    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    const DT = FIXED_DT
    const MAX_FRAME = 250

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const cssW = parent.clientWidth
      const cssH = parent.clientHeight
      if (cssW < 2 || cssH < 2) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      canvas.style.width = cssW + "px"
      canvas.style.height = cssH + "px"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      W = cssW
      H = cssH
      bg = buildBackground(cssW, cssH, dpr)
      // Repinta inmediato para que un resize no deje el canvas en blanco.
      render(ctx, stateRef.current, W, H, bg, hiRef.current)
    }

    const loop = (now: number) => {
      let frameTime = now - last
      last = now
      if (frameTime > MAX_FRAME) frameTime = MAX_FRAME
      acc += frameTime

      const st = stateRef.current
      let steps = 0
      while (acc >= DT && steps < 5) {
        step(st)
        acc -= DT
        steps++
      }

      render(ctx, st, W, H, bg, hiRef.current)

      if (st.isGameOver && !firedGameOver) {
        firedGameOver = true
        if (st.score > hiRef.current) {
          hiRef.current = st.score
          try {
            localStorage.setItem("nadie_hi", String(st.score))
          } catch {
            /* ignore */
          }
        }
        // Deja ver el "crash" un instante antes de montar la pantalla de game over.
        goTimeout = setTimeout(() => onGameOverRef.current(st.score), 700)
      }

      rafId = requestAnimationFrame(loop)
    }

    const start = () => {
      if (rafId) return
      last = performance.now()
      acc = 0
      rafId = requestAnimationFrame(loop)
    }
    const stop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }
    const updateRunning = () => {
      if (isActiveRef.current && !document.hidden) start()
      else stop()
    }
    updateRunningRef.current = updateRunning

    // --- Input ---
    // El keydown se escucha en el CANVAS (focusable), no en window: asi no captura
    // Espacio/flechas cuando el foco esta en otra ventana XP del escritorio.
    const tryJump = () => {
      if (!stateRef.current.isGameOver) jump(stateRef.current)
    }
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault()
      canvas.focus({ preventScroll: true })
      tryJump()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "ArrowUp" && e.key !== " " && e.key !== "ArrowUp") return
      if (e.repeat) return
      e.preventDefault()
      tryJump()
    }
    const onVisibility = () => updateRunning()
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 120)
    }

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false })
    canvas.addEventListener("keydown", onKeyDown)
    document.addEventListener("visibilitychange", onVisibility)

    const resizeObs = new ResizeObserver(onResize)
    if (canvas.parentElement) resizeObs.observe(canvas.parentElement)

    resize()
    updateRunning()
    // Foco inicial para que Espacio funcione nada mas entrar a la partida.
    canvas.focus({ preventScroll: true })

    return () => {
      stop()
      if (goTimeout) clearTimeout(goTimeout)
      if (resizeTimer) clearTimeout(resizeTimer)
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("visibilitychange", onVisibility)
      resizeObs.disconnect()
      updateRunningRef.current = () => {}
    }
    // Se monta una vez por partida; isActive se gestiona en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pausa/reanuda segun isActive sin re-montar el bucle.
  useEffect(() => {
    isActiveRef.current = isActive
    updateRunningRef.current()
  }, [isActive])

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: "none",
        cursor: "pointer",
        outline: "none",
      }}
    />
  )
}
