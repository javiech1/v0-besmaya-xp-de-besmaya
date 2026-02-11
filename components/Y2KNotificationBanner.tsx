"use client"

import { useState, useEffect, useCallback } from "react"

interface Y2KNotificationBannerProps {
  onOpenMuro: () => void
}

const MESSAGES = [
  { sender: "Laura", text: "quiere hablar contigo" },
  { sender: "Nadie", text: "quiere hablar contigo" },
]

export function Y2KNotificationBanner({ onOpenMuro }: Y2KNotificationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [sliding, setSliding] = useState<"in" | "out" | "idle">("idle")

  // Show the notification after a delay
  useEffect(() => {
    if (dismissed) return
    const timer = setTimeout(() => {
      setVisible(true)
      setSliding("in")
      const inTimer = setTimeout(() => setSliding("idle"), 400)
      return () => clearTimeout(inTimer)
    }, 3000)
    return () => clearTimeout(timer)
  }, [dismissed])

  // Cycle through messages
  useEffect(() => {
    if (!visible || dismissed) return
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [visible, dismissed])

  const handleDismiss = useCallback(() => {
    setSliding("out")
    setTimeout(() => {
      setVisible(false)
      setDismissed(true)
    }, 350)
  }, [])

  const handleOpenMuro = useCallback(() => {
    onOpenMuro()
    handleDismiss()
  }, [onOpenMuro, handleDismiss])

  if (!visible && sliding !== "out") return null

  const msg = MESSAGES[messageIndex]

  return (
    <div
      className={`y2k-notification ${
        sliding === "in" ? "y2k-slide-in" : sliding === "out" ? "y2k-slide-out" : ""
      }`}
    >
      {/* Title bar */}
      <div className="y2k-notification-header">
        <div className="y2k-notification-header-icon">
          <img src="/icons/muro.svg" alt="" width={14} height={14} />
        </div>
        <span className="y2k-notification-header-title">Besmaya Messenger</span>
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
          {msg.sender === "Nadie" ? (
            <img src="/icons/muro.svg" alt="" width={28} height={28} />
          ) : (
            <div className="y2k-notification-avatar-placeholder">L</div>
          )}
        </div>
        <div className="y2k-notification-message">
          <span className="y2k-notification-sender">{msg.sender}</span>{" "}
          <span className="y2k-notification-text">{msg.text}</span>
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
