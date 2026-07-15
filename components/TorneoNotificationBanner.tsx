"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface TorneoNotificationBannerProps {
  nadieVisible: boolean
  onOpenTorneo: () => void
  onDismiss?: () => void
}

// Anuncio del Torneo de Nadie. Ocupa el slot "album" del apilado de
// notificaciones (segunda posicion, bajo la de Nadie).
export function TorneoNotificationBanner({ nadieVisible, onOpenTorneo, onDismiss }: TorneoNotificationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [sliding, setSliding] = useState<"in" | "out" | "idle">("idle")
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (dismissed) return

    // No repetir si ya se cerro en esta sesion
    try {
      if (sessionStorage.getItem("torneo_notification_shown") === "true") {
        setDismissed(true)
        onDismissRef.current?.()
        return
      }
    } catch {
      // sessionStorage no disponible
    }

    const timer = setTimeout(() => {
      setVisible(true)
      setSliding("in")
      setTimeout(() => setSliding("idle"), 400)
    }, 600)

    return () => clearTimeout(timer)
  }, [dismissed])

  const handleDismiss = useCallback(() => {
    setSliding("out")
    onDismiss?.()
    try {
      sessionStorage.setItem("torneo_notification_shown", "true")
    } catch {
      // sessionStorage no disponible
    }
    setTimeout(() => {
      setVisible(false)
      setDismissed(true)
    }, 350)
  }, [onDismiss])

  const handlePlay = useCallback(() => {
    onOpenTorneo()
    handleDismiss()
  }, [onOpenTorneo, handleDismiss])

  if (!visible && sliding !== "out") return null

  return (
    <div
      className={`y2k-notification y2k-notification-album ${
        nadieVisible ? "" : "y2k-notification-album-top"
      } ${sliding === "in" ? "y2k-slide-in" : sliding === "out" ? "y2k-slide-out" : ""}`}
    >
      {/* Title bar */}
      <div className="y2k-notification-header">
        <span className="y2k-notification-header-title">Notificación del sistema</span>
        <button className="y2k-notification-close" onClick={handleDismiss} aria-label="Cerrar">
          x
        </button>
      </div>

      {/* Body */}
      <div className="y2k-notification-body">
        <div className="y2k-notification-avatar">
          <img src="/icons/torneo.svg" alt="" width={28} height={28} style={{ objectFit: "contain" }} />
        </div>
        <div className="y2k-notification-message">
          <span className="y2k-notification-sender">Torneo de Nadie</span>{" "}
          <span className="y2k-notification-text">
            destrona al nº1 del ranking y llévate un descuento en merch
          </span>
        </div>
      </div>

      {/* Action */}
      <div className="y2k-notification-actions">
        <button className="y2k-notification-btn" onClick={handlePlay}>
          Jugar
        </button>
      </div>
    </div>
  )
}
