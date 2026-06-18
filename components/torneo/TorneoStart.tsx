"use client"

import type { RankingEntry } from "@/lib/torneo/types"

interface TorneoStartProps {
  onStart: () => void
  initialRanking: RankingEntry[]
}

export function TorneoStart({ onStart, initialRanking }: TorneoStartProps) {
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
      <div className="w-full text-xs text-center px-2" style={{ color: "#333" }}>
        Nadie corre sin parar. <strong>Salta</strong> los obstáculos y llega lo más lejos posible.
        <br />
        Quien <strong>destrone al nº1</strong> gana un código de descuento de merch.
      </div>

      {/* Controls hint */}
      <div
        className="w-full text-xs text-center px-2 py-2 rounded-sm border"
        style={{ background: "#fff", borderColor: "#A0A0A0", color: "#555" }}
      >
        <span className="font-bold">Un solo control:</span> Espacio / clic / toca para saltar
      </div>

      {/* Play button */}
      <button
        type="button"
        onClick={onStart}
        className="w-full py-1.5 text-sm font-bold"
        style={{
          background:
            "linear-gradient(to bottom, #FFFFFF 0%, #D4D0C8 50%, #B8B4AC 51%, #D4D0C8 100%)",
          border: "2px solid",
          borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
          cursor: "pointer",
          fontFamily: "Tahoma, sans-serif",
          color: "#000",
        }}
      >
        JUGAR
      </button>

      {/* Ranking */}
      {initialRanking.length > 0 && (
        <div className="w-full">
          <div
            className="text-xs font-bold py-1 px-2 mb-1"
            style={{ background: "linear-gradient(to right, #0A246A, #3A78D4)", color: "#fff" }}
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
                  <td
                    className="px-2 py-0.5 font-bold"
                    style={{ color: i < 3 ? "#B8860B" : "#555", width: 24 }}
                  >
                    {i + 1}
                  </td>
                  <td className="px-2 py-0.5" style={{ color: "#000" }}>
                    {entry.alias}
                  </td>
                  <td
                    className="px-2 py-0.5 text-right font-bold"
                    style={{ color: "#0A246A" }}
                  >
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
