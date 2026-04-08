"use client"

import { useState, useEffect } from "react"
import { TorneoStart } from "@/components/torneo/TorneoStart"
import { TorneoGame } from "@/components/torneo/TorneoGame"
import { TorneoGameOver } from "@/components/torneo/TorneoGameOver"
import type { GamePhase, RankingEntry } from "@/lib/torneo/types"

export function TorneoContent() {
  const [phase, setPhase] = useState<GamePhase>("start")
  const [alias, setAlias] = useState("")
  const [finalScore, setFinalScore] = useState(0)
  const [initialRanking, setInitialRanking] = useState<RankingEntry[]>([])

  // Load ranking on mount
  useEffect(() => {
    fetch("/api/torneo/ranking")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInitialRanking(data)
      })
      .catch(() => {})
  }, [])

  const handleStart = (playerAlias: string) => {
    setAlias(playerAlias)
    setPhase("playing")
  }

  const handleGameOver = (score: number) => {
    setFinalScore(score)
    setPhase("gameover")
  }

  const handlePlayAgain = () => {
    // Refresh ranking before showing start
    fetch("/api/torneo/ranking")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInitialRanking(data)
      })
      .catch(() => {})
    setPhase("start")
  }

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{ background: "#ECE9D8" }}
    >
      {phase === "start" && (
        <TorneoStart onStart={handleStart} initialRanking={initialRanking} />
      )}

      {phase === "playing" && (
        <TorneoGame alias={alias} onGameOver={handleGameOver} />
      )}

      {phase === "gameover" && (
        <TorneoGameOver
          alias={alias}
          score={finalScore}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  )
}
