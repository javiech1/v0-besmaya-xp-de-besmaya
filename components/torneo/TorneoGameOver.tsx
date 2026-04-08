"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClient } from "@/lib/supabase/client"
import { scoreSubmissionSchema, type ScoreSubmissionInput } from "@/lib/torneo/validation"
import type { RankingEntry, Concert } from "@/lib/torneo/types"

interface TorneoGameOverProps {
  alias: string
  score: number
  onPlayAgain: () => void
}

type SubmitPhase = "form" | "confirm_existing" | "ranking"

interface ExistingInfo {
  previousAlias: string
  previousFecha: string
  previousCiudad: string
}

export function TorneoGameOver({ alias, score, onPlayAgain }: TorneoGameOverProps) {
  const [phase, setPhase] = useState<SubmitPhase>("form")
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [existingInfo, setExistingInfo] = useState<ExistingInfo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ScoreSubmissionInput>({
    resolver: zodResolver(scoreSubmissionSchema),
    defaultValues: { alias, score, confirm: false },
  })

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("concerts")
      .select("id, ciudad, sala, fecha")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setConcerts(data as Concert[])
      })
  }, [])

  const submitScore = async (data: ScoreSubmissionInput, confirmOverwrite = false) => {
    setIsSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/torneo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, confirm: confirmOverwrite }),
      })
      const json = await res.json()

      if (!res.ok) {
        setSubmitError(json.error || "Error al enviar")
        return
      }

      if (json.existing) {
        setExistingInfo({
          previousAlias: json.previousAlias,
          previousFecha: json.previousFecha,
          previousCiudad: json.previousCiudad,
        })
        setPhase("confirm_existing")
        return
      }

      setRanking(json.ranking || [])
      setPhase("ranking")
    } catch {
      setSubmitError("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = (data: ScoreSubmissionInput) => {
    submitScore(data, false)
  }

  const onConfirmOverwrite = () => {
    const data = getValues()
    submitScore(data, true)
  }

  if (phase === "confirm_existing" && existingInfo) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-4 gap-4"
        style={{ fontFamily: "Tahoma, sans-serif", background: "#ECE9D8" }}
      >
        {/* XP warning dialog */}
        <div className="w-full border-2" style={{ borderColor: "#0A246A", background: "#ECE9D8" }}>
          <div
            className="px-2 py-1 flex items-center gap-2"
            style={{ background: "linear-gradient(to right, #0A246A, #3A78D4)" }}
          >
            <span className="text-yellow-300 font-bold text-sm">⚠</span>
            <span className="text-white text-xs font-bold">Confirmación requerida</span>
          </div>
          <div className="p-3 text-xs" style={{ color: "#000" }}>
            <p className="mb-2">
              Ya existe una entrada con este email bajo el alias{" "}
              <strong>{existingInfo.previousAlias}</strong> con el concierto de{" "}
              <strong>
                {existingInfo.previousCiudad}
                {existingInfo.previousFecha ? ` (${existingInfo.previousFecha})` : ""}
              </strong>.
            </p>
            <p>¿Quieres actualizar tu selección con los nuevos datos?</p>
          </div>
          <div className="flex justify-end gap-2 px-3 pb-3">
            <button
              onClick={() => setPhase("form")}
              className="px-3 py-1 text-xs"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF 0%, #D4D0C8 50%, #B8B4AC 51%, #D4D0C8 100%)",
                border: "2px solid",
                borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
                fontFamily: "Tahoma, sans-serif",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmOverwrite}
              disabled={isSubmitting}
              className="px-3 py-1 text-xs font-bold"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF 0%, #D4D0C8 50%, #B8B4AC 51%, #D4D0C8 100%)",
                border: "2px solid",
                borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
                fontFamily: "Tahoma, sans-serif",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Enviando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "ranking") {
    return (
      <div
        className="h-full flex flex-col items-center p-4 gap-4 overflow-y-auto"
        style={{ fontFamily: "Tahoma, sans-serif", background: "#ECE9D8" }}
      >
        <div
          className="w-full text-center py-2 px-3 rounded-sm"
          style={{
            background: "linear-gradient(to right, #0A246A, #3A78D4)",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 13,
          }}
        >
          ¡Entrada registrada!
        </div>

        <p className="text-xs text-center" style={{ color: "#333" }}>
          Te contactaremos con los detalles en tu email.
        </p>

        <div className="w-full">
          <div
            className="text-xs font-bold py-1 px-2 mb-1"
            style={{
              background: "linear-gradient(to right, #0A246A, #3A78D4)",
              color: "#fff",
            }}
          >
            Top 10 — Torneo de Nadie
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {ranking.map((entry, i) => (
                <tr
                  key={i}
                  style={{
                    background:
                      entry.alias === alias
                        ? "#FFF3CD"
                        : i % 2 === 0
                        ? "#fff"
                        : "#EEF0F4",
                    borderBottom: "1px solid #D4D0C8",
                    fontWeight: entry.alias === alias ? "bold" : "normal",
                  }}
                >
                  <td className="px-2 py-0.5" style={{ color: i < 3 ? "#B8860B" : "#555", width: 24 }}>
                    {i + 1}
                  </td>
                  <td className="px-2 py-0.5" style={{ color: "#000" }}>
                    {entry.alias}
                    {entry.alias === alias && " ← tú"}
                  </td>
                  <td className="px-2 py-0.5 text-right font-bold" style={{ color: "#0A246A" }}>
                    {entry.score.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-1 text-sm font-bold"
          style={{
            background: "linear-gradient(to bottom, #FFFFFF 0%, #D4D0C8 50%, #B8B4AC 51%, #D4D0C8 100%)",
            border: "2px solid",
            borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
            fontFamily: "Tahoma, sans-serif",
            cursor: "pointer",
          }}
        >
          Jugar de nuevo
        </button>
      </div>
    )
  }

  // "form" phase
  return (
    <div
      className="h-full flex flex-col items-center overflow-y-auto p-4 gap-3"
      style={{ fontFamily: "Tahoma, sans-serif", background: "#ECE9D8" }}
    >
      {/* Game Over header */}
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
        <p className="text-xs" style={{ color: "#555" }}>Puntuación final</p>
        <p
          className="font-bold"
          style={{ fontSize: 28, color: "#0A246A", fontFamily: "Tahoma, sans-serif" }}
        >
          {score.toLocaleString()}
        </p>
      </div>

      <p className="text-xs text-center" style={{ color: "#333" }}>
        Deja tu email para participar en el sorteo de invitaciones:
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-2">
        <input type="hidden" {...register("alias")} value={alias} />
        <input type="hidden" {...register("score", { valueAsNumber: true })} value={score} />

        <div>
          <label className="text-xs font-bold block mb-0.5" style={{ color: "#000" }}>
            Email
          </label>
          <input
            type="email"
            {...register("email")}
            placeholder="tu@email.com"
            className="w-full px-2 py-1 text-sm border"
            style={{
              borderColor: errors.email ? "#D4380A" : "#7B9EBD",
              borderWidth: "2px",
              borderStyle: "inset",
              background: "#fff",
              outline: "none",
              fontFamily: "Tahoma, sans-serif",
            }}
          />
          {errors.email && (
            <p className="text-xs mt-0.5" style={{ color: "#D4380A" }}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold block mb-0.5" style={{ color: "#000" }}>
            Concierto al que quieres ir
          </label>
          <select
            {...register("concert_id")}
            className="w-full px-2 py-1 text-xs border"
            style={{
              borderColor: errors.concert_id ? "#D4380A" : "#7B9EBD",
              borderWidth: "2px",
              background: "#fff",
              outline: "none",
              fontFamily: "Tahoma, sans-serif",
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Selecciona un concierto...
            </option>
            {concerts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fecha} — {c.ciudad} ({c.sala})
              </option>
            ))}
          </select>
          {errors.concert_id && (
            <p className="text-xs mt-0.5" style={{ color: "#D4380A" }}>
              {errors.concert_id.message}
            </p>
          )}
        </div>

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
            background: isSubmitting
              ? "#D4D0C8"
              : "linear-gradient(to bottom, #FFFFFF 0%, #D4D0C8 50%, #B8B4AC 51%, #D4D0C8 100%)",
            border: "2px solid",
            borderColor: "#FFFFFF #808080 #808080 #FFFFFF",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontFamily: "Tahoma, sans-serif",
          }}
        >
          {isSubmitting ? "Enviando..." : "Participar"}
        </button>
      </form>

      <button
        onClick={onPlayAgain}
        className="text-xs underline"
        style={{ color: "#0A246A", cursor: "pointer", background: "none", border: "none" }}
      >
        Jugar de nuevo sin participar
      </button>
    </div>
  )
}
