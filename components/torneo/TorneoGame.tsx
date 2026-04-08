"use client"

import { useEffect, useRef } from "react"
import { createInitialState, tick, moveLeft, moveRight, render } from "@/lib/torneo/gameEngine"
import type { GameState } from "@/lib/torneo/types"

interface TorneoGameProps {
  alias: string
  onGameOver: (score: number) => void
}

export function TorneoGame({ alias, onGameOver }: TorneoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(createInitialState())
  const animIdRef = useRef<number>(0)
  const onGameOverRef = useRef(onGameOver)
  onGameOverRef.current = onGameOver

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    stateRef.current = createInitialState()

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }
    resize()

    const resizeObs = new ResizeObserver(resize)
    if (canvas.parentElement) resizeObs.observe(canvas.parentElement)

    const loop = () => {
      const state = stateRef.current
      if (state.isGameOver) {
        render(ctx, state, canvas.width, canvas.height)
        onGameOverRef.current(state.score)
        return
      }
      stateRef.current = tick(state)
      render(ctx, stateRef.current, canvas.width, canvas.height)
      animIdRef.current = requestAnimationFrame(loop)
    }
    animIdRef.current = requestAnimationFrame(loop)

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        stateRef.current = moveLeft(stateRef.current)
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        stateRef.current = moveRight(stateRef.current)
      }
    }
    window.addEventListener("keydown", onKeyDown)

    // Touch/swipe controls
    let touchStartX = 0
    const onTouchStart = (e: TouchEvent) => {
      e.stopPropagation()
      touchStartX = e.touches[0].clientX
    }
    const onTouchEnd = (e: TouchEvent) => {
      e.stopPropagation()
      const deltaX = e.changedTouches[0].clientX - touchStartX
      if (Math.abs(deltaX) > 30) {
        if (deltaX < 0) {
          stateRef.current = moveLeft(stateRef.current)
        } else {
          stateRef.current = moveRight(stateRef.current)
        }
      }
    }
    canvas.addEventListener("touchstart", onTouchStart, { passive: false })
    canvas.addEventListener("touchend", onTouchEnd, { passive: false })

    return () => {
      cancelAnimationFrame(animIdRef.current)
      window.removeEventListener("keydown", onKeyDown)
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchend", onTouchEnd)
      resizeObs.disconnect()
    }
  }, [alias])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: "none",
        cursor: "none",
      }}
    />
  )
}
