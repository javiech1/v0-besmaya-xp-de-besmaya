"use client"

import type React from "react"
import { useState } from "react"
import type { RankingEntry } from "@/lib/torneo/types"

interface TorneoStartProps {
  onStart: (alias: string) => void
  initialRanking: RankingEntry[]
}

export function TorneoStart({ onStart, initialRanking }: TorneoStartProps) {
  const [alias, setAlias] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = alias.trim()
    if (!trimmed) return
    onStart(trimmed)
  }

  return (
    <div
      className="h-full flex flex-col items-center justify-start overflow-y-auto p-4 gap-4"
      style={{ fontFamily: "Tahoma, sans-serif", background: "#ECE9D8" }}
    >
      {/* Title */}
      <div
        className="w-full text-center py-2 px-3 rounded-sm"
        style={{
          background: "linear-gradient(to right, #0A246A, #3A78D4)",
          color: "#fff",
          fontWeight: "bold",
          fontSize: 15,
          letterSpacing: 1,
          textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
        }}
      >
        TORNEO DE NADIE
      </div>

      {/* Description */}
      <div
        className="w-full text-xs text-center px-2"
        style={{ color: "#333" }}
      >
        Esquiva obstáculos y llega lo más lejos posible.<br />
        Los 10 mejores consiguen una invitación al concierto.
      </div>

      {/* Controls hint */}
      <div
        className="w-full text-xs text-center px-2 py-2 rounded-sm border"
        style={{ background: "#fff", borderColor: "#A0A0A0", color: "#555" }}
      >
        <span className="font-bold">Desktop:</span> ← → o A / D
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <span className="font-bold">Mobile:</span> desliza
      </div>

      {/* Alias form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
        <label className="text-xs font-bold" style={{ color: "#000" }}>
          Tu alias:
        </label>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          maxLength={20}
          placeholder="Como quieres que te conozcan..."
          autoFocus
          className="w-full px-2 py-1 text-sm border"
          style={{
            borderColor: "#7B9EBD",
            borderWidth: "2px",
            borderStyle: "inset",
            background: "#fff",
            outline: "none",
            fontFamily: "Tahoma, sans-serif",
          }}
        />
        <button
          type="submit"
          disabled={!alias.trim()}
          className="w-full py-1 text-sm font-bold mt-1"
          style={{
            background: alias.trim()
              ? "linear-gradient(to bottom, #FFFFFF 0%, #D4D0C8 50%, #B8B4AC 51%, #D4D0C8 100%)"
              : "#D4D0C8",
            border: "2px solid",
            borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
            cursor: alias.trim() ? "pointer" : "not-allowed",
            fontFamily: "Tahoma, sans-serif",
            color: alias.trim() ? "#000" : "#888",
          }}
        >
          JUGAR
        </button>
      </form>

      {/* Ranking */}
      {initialRanking.length > 0 && (
        <div className="w-full">
          <div
            className="text-xs font-bold py-1 px-2 mb-1"
            style={{
              background: "linear-gradient(to right, #0A246A, #3A78D4)",
              color: "#fff",
            }}
          >
            Ranking actual
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {initialRanking.map((entry, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#EEF0F4",
                    borderBottom: "1px solid #D4D0C8",
                  }}
                >
                  <td className="px-2 py-0.5 font-bold" style={{ color: i < 3 ? "#B8860B" : "#555", width: 24 }}>
                    {i + 1}
                  </td>
                  <td className="px-2 py-0.5" style={{ color: "#000" }}>{entry.alias}</td>
                  <td className="px-2 py-0.5 text-right font-bold" style={{ color: "#0A246A" }}>
                    {entry.score.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
