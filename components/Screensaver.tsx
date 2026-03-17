"use client"

import { useEffect, useRef, useCallback } from "react"

const COLORS = [
  "#FF0000", "#00FF00", "#0088FF", "#FF00FF",
  "#FFFF00", "#00FFFF", "#FF8800", "#88FF00",
  "#FF0088", "#8800FF", "#FFFFFF",
]

const SPEED = 2
const FONT_SIZE = 72

export function Screensaver({ onDeactivate }: { onDeactivate: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    x: 100,
    y: 100,
    dx: SPEED,
    dy: SPEED,
    color: COLORS[0],
    initialized: false,
  })

  const pickRandomColor = useCallback((current: string) => {
    let next = current
    while (next === current) {
      next = COLORS[Math.floor(Math.random() * COLORS.length)]
    }
    return next
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Initialize position randomly if first render
    if (!stateRef.current.initialized) {
      stateRef.current.x = Math.random() * (canvas.width - 300)
      stateRef.current.y = Math.random() * (canvas.height - FONT_SIZE) + FONT_SIZE
      stateRef.current.initialized = true
    }

    let animId: number

    const draw = () => {
      const s = stateRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.font = `bold ${FONT_SIZE}px Arial, sans-serif`
      ctx.fillStyle = s.color
      ctx.fillText("BESMAYA", s.x, s.y)

      const textWidth = ctx.measureText("BESMAYA").width

      s.x += s.dx
      s.y += s.dy

      let bounced = false

      if (s.x <= 0) {
        s.x = 0
        s.dx = Math.abs(s.dx)
        bounced = true
      } else if (s.x + textWidth >= canvas.width) {
        s.x = canvas.width - textWidth
        s.dx = -Math.abs(s.dx)
        bounced = true
      }

      if (s.y - FONT_SIZE <= 0) {
        s.y = FONT_SIZE
        s.dy = Math.abs(s.dy)
        bounced = true
      } else if (s.y >= canvas.height) {
        s.y = canvas.height
        s.dy = -Math.abs(s.dy)
        bounced = true
      }

      if (bounced) {
        s.color = pickRandomColor(s.color)
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [pickRandomColor])

  // Deactivate on any interaction
  useEffect(() => {
    const deactivate = () => onDeactivate()
    // Small delay to prevent immediate deactivation from the same event that might have triggered
    const timer = setTimeout(() => {
      document.addEventListener("mousemove", deactivate)
      document.addEventListener("keydown", deactivate)
      document.addEventListener("click", deactivate)
      document.addEventListener("touchstart", deactivate)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousemove", deactivate)
      document.removeEventListener("keydown", deactivate)
      document.removeEventListener("click", deactivate)
      document.removeEventListener("touchstart", deactivate)
    }
  }, [onDeactivate])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "black",
        cursor: "none",
      }}
    />
  )
}
