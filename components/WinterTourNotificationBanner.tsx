"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

interface WinterTourNotificationBannerProps {
  nadieVisible: boolean
  albumVisible?: boolean
}

export function WinterTourNotificationBanner({
  nadieVisible,
  albumVisible = false,
}: WinterTourNotificationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [sliding, setSliding] = useState<"in" | "out" | "idle">("idle")
  const router = useRouter()
  const mountedRef = useRef(false)

  useEffect(() => {
    if (dismissed || mountedRef.current) return
    mountedRef.current = true

    try {
      if (sessionStorage.getItem("winter_tour_notification_shown") === "true") {
        setDismissed(true)
        return
      }
    } catch {}

    const timer = setTimeout(() => {
      setVisible(true)
      setSliding("in")
      setTimeout(() => setSliding("idle"), 400)
    }, 600)

    return () => clearTimeout(timer)
  }, [dismissed])

  const handleDismiss = useCallback(() => {
    setSliding("out")
    try {
      sessionStorage.setItem("winter_tour_notification_shown", "true")
    } catch {}
    setTimeout(() => {
      setVisible(false)
      setDismissed(true)
    }, 350)
  }, [])

  const handleOpen = useCallback(() => {
    router.push("/conciertos?tab=conciertos")
    handleDismiss()
  }, [router, handleDismiss])

  if (!visible && sliding !== "out") return null

  // Reusamos la posición del banner de conciertos (mismo slot, copy distinto)
  let positionClass = "y2k-notification-concert"
  if (albumVisible) {
    positionClass = "y2k-notification-concert y2k-notification-concert-below-album"
    if (!nadieVisible) {
      positionClass =
        "y2k-notification-concert y2k-notification-concert-below-album y2k-notification-album-top"
    }
  }

  return (
    <div
      className={`y2k-notification ${positionClass} ${
        !albumVisible && !nadieVisible ? "y2k-notification-top" : ""
      } ${sliding === "in" ? "y2k-slide-in" : sliding === "out" ? "y2k-slide-out" : ""}`}
    >
      <div className="y2k-notification-header">
        <span className="y2k-notification-header-title">Notificación del sistema</span>
        <button className="y2k-notification-close" onClick={handleDismiss} aria-label="Cerrar">
          x
        </button>
      </div>

      <div className="y2k-notification-body">
        <div className="y2k-notification-avatar">
          <img
            src="/icons/conciertos.png"
            alt=""
            width={28}
            height={28}
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className="y2k-notification-message">
          <span className="y2k-notification-text">La gira de invierno</span>
        </div>
      </div>

      <div className="y2k-notification-actions">
        <button className="y2k-notification-btn" onClick={handleOpen}>
          Comprar Entradas
        </button>
      </div>
    </div>
  )
}
