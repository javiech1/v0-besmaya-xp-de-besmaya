"use client"

import { useState, useEffect, useCallback } from "react"


interface Y2KNotificationBannerProps {
  onOpenMuro: () => void
  onDismiss?: () => void
}

export function Y2KNotificationBanner({ onOpenMuro, onDismiss }: Y2KNotificationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [sliding, setSliding] = useState<"in" | "out" | "idle">("idle")

  // Show the notification immediately on mount
  useEffect(() => {
    if (dismissed) return
    setVisible(true)
    setSliding("in")
    const inTimer = setTimeout(() => setSliding("idle"), 400)
    return () => clearTimeout(inTimer)
  }, [dismissed])

  const handleDismiss = useCallback(() => {
    setSliding("out")
    onDismiss?.()
    setTimeout(() => {
      setVisible(false)
      setDismissed(true)
    }, 350)
  }, [onDismiss])

  const handleOpenMuro = useCallback(() => {
    onOpenMuro()
    handleDismiss()
  }, [onOpenMuro, handleDismiss])

  if (!visible && sliding !== "out") return null

  return (
    <div
      className={`y2k-notification ${
        sliding === "in" ? "y2k-slide-in" : sliding === "out" ? "y2k-slide-out" : ""
      }`}
    >
      {/* Title bar */}
      <div className="y2k-notification-header">
        <span className="y2k-notification-header-title">Notificación del sistema</span>
        <button
          className="y2k-notification-close"
          onClick={handleDismiss}
          aria-label="Cerrar"
        >
          x
        </button>
      </div>

      {/* Body */}
      <div className="y2k-notification-body">
        <div className="y2k-notification-avatar">
          <img src="/icons/muro.svg" alt="" width={28} height={28} />
        </div>
        <div className="y2k-notification-message">
          <span className="y2k-notification-sender">Nadie</span>{" "}
          <span className="y2k-notification-text">quiere hablar contigo</span>
        </div>
      </div>

      {/* Action */}
      <div className="y2k-notification-actions">
        <button className="y2k-notification-btn" onClick={handleOpenMuro}>
          Abrir El Muro de Nadie
        </button>
      </div>
    </div>
  )
}
