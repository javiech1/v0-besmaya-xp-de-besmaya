"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { aliasSchema, type AliasInput } from "@/lib/torneo/validation"
import type { RankingEntry, SubmitScoreResponse } from "@/lib/torneo/types"

interface TorneoGameOverProps {
  score: number
  onPlayAgain: () => void
}

const XP_BUTTON =
  "linear-gradient(to bottom, #FFFFFF 0%, #D4D0C8 50%, #B8B4AC 51%, #D4D0C8 100%)"

export function TorneoGameOver({ score, onPlayAgain }: TorneoGameOverProps) {
  const [phase, setPhase] = useState<"form" | "result">("form")
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [playerRank, setPlayerRank] = useState<number>(0)
  const [isChampion, setIsChampion] = useState(false)
  const [merchCode, setMerchCode] = useState("")
  const [storeUrl, setStoreUrl] = useState("")
  const [submittedAlias, setSubmittedAlias] = useState("")
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AliasInput>({
    resolver: zodResolver(aliasSchema),
    defaultValues: { alias: "" },
  })

  const onSubmit = async (data: AliasInput) => {
    setIsSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/torneo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: data.alias.trim(), score }),
      })
      const json: SubmitScoreResponse = await res.json()
      if (!res.ok) {
        setSubmitError(json.error || "Error al enviar")
        return
      }
      setRanking(json.ranking || [])
      setPlayerRank(json.playerRank || 0)
      setIsChampion(!!json.isChampion)
      setMerchCode(json.merchCode || "")
      setStoreUrl(json.storeUrl || "")
      setSubmittedAlias(data.alias.trim())
      setPhase("result")
    } catch {
      setSubmitError("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(merchCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  // ---------------- RESULT: CAMPEÓN ----------------
  if (phase === "result" && isChampion) {
    return (
      <div
        className="h-full flex flex-col items-center overflow-y-auto p-4 gap-3"
        style={{ fontFamily: "Tahoma, sans-serif", background: "#ECE9D8" }}
      >
        <div
          className="w-full text-center py-2 px-3 rounded-sm"
          style={{
            background: "linear-gradient(to right, #B8860B, #FFD700)",
            color: "#3a2c00",
            fontWeight: "bold",
            fontSize: 15,
            textShadow: "0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          👑 ¡Has destronado al nº1!
        </div>

        <p className="text-xs text-center" style={{ color: "#333" }}>
          Eres el nuevo número uno con <strong>{score.toLocaleString()}</strong> puntos.
          <br />
          Aquí tienes tu código de descuento para la tienda:
        </p>

        <div
          className="w-full text-center py-2 px-2 select-text"
          style={{
            background: "#fff",
            border: "2px inset #7B9EBD",
            fontFamily: "'Lucida Console', monospace",
            fontSize: 18,
            fontWeight: "bold",
            color: "#0A246A",
            letterSpacing: 1,
            userSelect: "text",
          }}
        >
          {merchCode}
        </div>

        <div className="w-full flex gap-2">
          <button
            type="button"
            onClick={copyCode}
            className="flex-1 py-1 text-xs font-bold"
            style={{
              background: XP_BUTTON,
              border: "2px solid",
              borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
              cursor: "pointer",
              fontFamily: "Tahoma, sans-serif",
            }}
          >
            {copied ? "¡Copiado!" : "Copiar código"}
          </button>
          {storeUrl && (
            <button
              type="button"
              onClick={() => window.open(storeUrl, "_blank", "noopener,noreferrer")}
              className="flex-1 py-1 text-xs font-bold"
              style={{
                background: XP_BUTTON,
                border: "2px solid",
                borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
                cursor: "pointer",
                fontFamily: "Tahoma, sans-serif",
              }}
            >
              Comprar merch
            </button>
          )}
        </div>

        <RankingTable ranking={ranking} highlightAlias={submittedAlias} highlightRank={1} />

        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full py-1 text-sm font-bold"
          style={{
            background: XP_BUTTON,
            border: "2px solid",
            borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
            cursor: "pointer",
            fontFamily: "Tahoma, sans-serif",
          }}
        >
          Jugar de nuevo
        </button>
      </div>
    )
  }

  // ---------------- RESULT: NO CAMPEÓN ----------------
  if (phase === "result") {
    const topScore = ranking[0]?.score ?? 0
    const inTop10 = playerRank > 0 && playerRank <= 10
    return (
      <div
        className="h-full flex flex-col items-center overflow-y-auto p-4 gap-3"
        style={{ fontFamily: "Tahoma, sans-serif", background: "#ECE9D8" }}
      >
        <div
          className="w-full text-center py-2 px-3 rounded-sm"
          style={{
            background: "linear-gradient(to right, #0A246A, #3A78D4)",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          ¡Puntuación registrada!
        </div>

        <p className="text-xs text-center" style={{ color: "#333" }}>
          Eres el <strong>nº {playerRank}</strong> con {score.toLocaleString()} puntos.
          {topScore > 0 && (
            <>
              <br />
              El nº1 tiene <strong>{topScore.toLocaleString()}</strong>. ¡Supéralo para ganar el
              código de descuento!
            </>
          )}
        </p>

        <RankingTable
          ranking={ranking}
          highlightAlias={submittedAlias}
          highlightRank={inTop10 ? playerRank : 0}
        />

        {!inTop10 && playerRank > 0 && (
          <div className="w-full text-xs text-center" style={{ color: "#555" }}>
            … Tú: nº {playerRank} — {score.toLocaleString()}
          </div>
        )}

        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full py-1 text-sm font-bold"
          style={{
            background: XP_BUTTON,
            border: "2px solid",
            borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
            cursor: "pointer",
            fontFamily: "Tahoma, sans-serif",
          }}
        >
          Jugar de nuevo
        </button>
      </div>
    )
  }

  // ---------------- FORM ----------------
  return (
    <div
      className="h-full flex flex-col items-center overflow-y-auto p-4 gap-3"
      style={{ fontFamily: "Tahoma, sans-serif", background: "#ECE9D8" }}
    >
      <div
        className="w-full text-center py-2"
        style={{
          background: "#D4380A",
          color: "#fff",
          fontWeight: "bold",
          fontSize: 16,
          letterSpacing: 2,
        }}
      >
        GAME OVER
      </div>

      <div className="text-center">
        <p className="text-xs" style={{ color: "#555" }}>
          Puntuación final
        </p>
        <p className="font-bold" style={{ fontSize: 28, color: "#0A246A" }}>
          {score.toLocaleString()}
        </p>
      </div>

      <p className="text-xs text-center" style={{ color: "#333" }}>
        Pon tu nombre para entrar en el ranking:
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-2">
        <input
          type="text"
          {...register("alias")}
          maxLength={20}
          placeholder="Tu nombre..."
          autoFocus
          className="w-full px-2 py-1 border"
          style={{
            borderColor: errors.alias ? "#D4380A" : "#7B9EBD",
            borderWidth: "2px",
            borderStyle: "inset",
            background: "#fff",
            outline: "none",
            fontFamily: "Tahoma, sans-serif",
            fontSize: 16, // >=16px evita el auto-zoom de iOS
          }}
        />
        {errors.alias && (
          <p className="text-xs" style={{ color: "#D4380A" }}>
            {errors.alias.message}
          </p>
        )}
        {submitError && (
          <p className="text-xs" style={{ color: "#D4380A" }}>
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-1 text-sm font-bold mt-1"
          style={{
            background: isSubmitting ? "#D4D0C8" : XP_BUTTON,
            border: "2px solid",
            borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontFamily: "Tahoma, sans-serif",
          }}
        >
          {isSubmitting ? "Guardando..." : "Guardar"}
        </button>
      </form>

      <button
        type="button"
        onClick={onPlayAgain}
        className="text-xs underline"
        style={{ color: "#0A246A", cursor: "pointer", background: "none", border: "none" }}
      >
        Jugar de nuevo sin guardar
      </button>
    </div>
  )
}

function RankingTable({
  ranking,
  highlightAlias,
  highlightRank,
}: {
  ranking: RankingEntry[]
  highlightAlias: string
  highlightRank: number
}) {
  if (ranking.length === 0) return null
  return (
    <div className="w-full">
      <div
        className="text-xs font-bold py-1 px-2 mb-1"
        style={{ background: "linear-gradient(to right, #0A246A, #3A78D4)", color: "#fff" }}
      >
        Top 10 — Torneo de Nadie
      </div>
      <table className="w-full text-xs border-collapse">
        <tbody>
          {ranking.map((entry, i) => {
            const isYou = i + 1 === highlightRank && entry.alias === highlightAlias
            return (
              <tr
                key={i}
                style={{
                  background: isYou ? "#FFF3CD" : i % 2 === 0 ? "#fff" : "#EEF0F4",
                  borderBottom: "1px solid #D4D0C8",
                  fontWeight: isYou ? "bold" : "normal",
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
                  {isYou && " ← tú"}
                </td>
                <td className="px-2 py-0.5 text-right font-bold" style={{ color: "#0A246A" }}>
                  {entry.score.toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
