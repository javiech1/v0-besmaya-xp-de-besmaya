"use client"

import { useState, useEffect, useCallback } from "react"

interface AlbumNotificationBannerProps {
  nadieVisible: boolean
  onDismiss?: () => void
}

export function AlbumNotificationBanner({ nadieVisible, onDismiss }: AlbumNotificationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [sliding, setSliding] = useState<"in" | "out" | "idle">("idle")

  useEffect(() => {
    if (dismissed) return

    // Don't show again if already shown this session
    try {
      if (sessionStorage.getItem("album_notification_shown") === "true") {
        setDismissed(true)
        onDismiss?.()
        return
      }
    } catch {
      // sessionStorage not available
    }

    // Show with a small delay after mount
    const timer = setTimeout(() => {
      setVisible(true)
      setSliding("in")
      setTimeout(() => setSliding("idle"), 400)
    }, 300)

    return () => clearTimeout(timer)
  }, [dismissed, onDismiss])

  const handleDismiss = useCallback(() => {
    setSliding("out")
    onDismiss?.()
    try {
      sessionStorage.setItem("album_notification_shown", "true")
    } catch {
      // sessionStorage not available
    }
    setTimeout(() => {
      setVisible(false)
      setDismissed(true)
    }, 350)
  }, [onDismiss])

  const handleBuy = useCallback(() => {
    window.open("https://acqustic-platform.sumupstore.com/producto/la-vida-de-nadie-besmaya", "_blank")
    handleDismiss()
  }, [handleDismiss])

  if (!visible && sliding !== "out") return null

  return (
    <div
      className={`y2k-notification y2k-notification-album ${
        nadieVisible ? '' : 'y2k-notification-album-top'
      } ${
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
          <img src="/icons/vinilo.png" alt="" width={28} height={28} style={{ objectFit: "contain" }} />
        </div>
        <div className="y2k-notification-message">
          <span className="y2k-notification-text">Ya disponible el álbum en físico</span>
        </div>
      </div>

      {/* Action */}
      <div className="y2k-notification-actions">
        <button className="y2k-notification-btn" onClick={handleBuy}>
          comprar
        </button>
      </div>
    </div>
  )
}
