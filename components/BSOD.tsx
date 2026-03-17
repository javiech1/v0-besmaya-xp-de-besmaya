"use client"

import { useEffect, useState } from "react"

const BSOD_MESSAGES: Record<string, { title: string; message: string }> = {
  "format c:": {
    title: "FORMAT_COMPLETE",
    message: "Se ha formateado todo. Incluyendo tus canciones favoritas.",
  },
  "delete system32": {
    title: "CRITICAL_SYSTEM_DELETED",
    message: "Has eliminado system32. Nadie ya no puede responderte.",
  },
  "rm -rf": {
    title: "RECURSIVE_DELETE_FATAL",
    message: "Has borrado todo. Hasta los recuerdos.",
  },
  "shutdown": {
    title: "SYSTEM_SHUTDOWN",
    message: "El sistema se está apagando... mentira, esto es una web.",
  },
  "apagar": {
    title: "SYSTEM_SHUTDOWN",
    message: "El sistema se está apagando... mentira, esto es una web.",
  },
  "ctrl+alt+supr": {
    title: "TASK_MANAGER_DENIED",
    message: "Buen intento. Pero Nadie no se puede cerrar.",
  },
}

export function checkBSODTrigger(text: string): string | null {
  const normalized = text.trim().toLowerCase()
  for (const trigger of Object.keys(BSOD_MESSAGES)) {
    if (normalized === trigger || normalized.startsWith(trigger)) {
      return trigger
    }
  }
  return null
}

export function BSOD({ trigger, onDismiss }: { trigger: string; onDismiss: () => void }) {
  const [phase, setPhase] = useState<"blue" | "black">("blue")
  const info = BSOD_MESSAGES[trigger] || BSOD_MESSAGES["format c:"]

  useEffect(() => {
    const handleInteraction = () => {
      if (phase === "blue") {
        setPhase("black")
        setTimeout(onDismiss, 800)
      }
    }

    // Small delay to prevent immediate dismissal
    const timer = setTimeout(() => {
      document.addEventListener("keydown", handleInteraction)
      document.addEventListener("click", handleInteraction)
      document.addEventListener("touchstart", handleInteraction)
    }, 500)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("keydown", handleInteraction)
      document.removeEventListener("click", handleInteraction)
      document.removeEventListener("touchstart", handleInteraction)
    }
  }, [phase, onDismiss])

  if (phase === "black") {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "black",
        transition: "opacity 0.5s",
      }} />
    )
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#0000AA",
      fontFamily: "Lucida Console, Courier New, monospace",
      color: "white",
      padding: "10vh 10vw",
      cursor: "none",
      userSelect: "none",
    }}>
      <div style={{ maxWidth: 700 }}>
        <p style={{
          background: "#AAAAAA", color: "#0000AA",
          display: "inline-block", padding: "2px 8px",
          fontWeight: "bold", fontSize: 16,
          marginBottom: 24,
        }}>
          Windows
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
          A problem has been detected and Windows has been shut down to prevent damage to your computer.
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 24, fontWeight: "bold" }}>
          {info.title}
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
          {info.message}
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
          If this is the first time you&apos;ve seen this Stop error screen, restart your computer. If this screen appears again, follow these steps:
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
          Check to make sure you haven&apos;t accidentally deleted all your Besmaya playlists. If a new playlist was recently added, ask Nadie for recommendations.
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 8 }}>
          Technical information:
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 32 }}>
          *** STOP: 0x000000B5 (0x0000BSMYA, 0x00000000, 0x00000000, 0x00000000)
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.8, opacity: 0.9 }}>
          Press any key to restart_
        </p>
      </div>
    </div>
  )
}
