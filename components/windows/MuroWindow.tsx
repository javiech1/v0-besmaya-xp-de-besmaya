"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { getFromCache, setToCache } from "@/lib/cache"
import { checkBSODTrigger } from "@/components/BSOD"
import { createClient } from "@/lib/supabase/client"

interface MuroComment {
  id: string
  username: string
  content: string
  created_at: string
  is_nadie?: boolean
}

export function MuroContent() {
  const [comments, setComments] = useState<MuroComment[]>([])
  const [username, setUsername] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [waitingForNadie, setWaitingForNadie] = useState(false)
  const waitingSinceRef = useRef<number>(0)
  const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [highlightedReplyId, setHighlightedReplyId] = useState<string | null>(null)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unseenCountRef = useRef(0)
  const originalTitleRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const notifiedReplyIdsRef = useRef<Set<string>>(new Set())

  const ensureAudioCtx = () => {
    if (audioCtxRef.current || typeof window === "undefined") return audioCtxRef.current
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (Ctor) audioCtxRef.current = new Ctor()
    } catch {}
    return audioCtxRef.current
  }

  const playNadieSound = () => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    try {
      const t0 = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(880, t0)
      osc.frequency.exponentialRampToValueAtTime(523, t0 + 0.18)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25)
      osc.start(t0)
      osc.stop(t0 + 0.28)
    } catch {}
  }
  const [sessionUsername] = useState(() => {
    if (typeof window === "undefined") return ""
    const stored = sessionStorage.getItem("muro_username")
    if (stored) return stored
    const generated = "user" + Math.random().toString(36).slice(2, 6)
    sessionStorage.setItem("muro_username", generated)
    return generated
  })
  const feedRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const isPostingRef = useRef(false)
  const isAtBottomRef = useRef(true)

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }

  useEffect(() => {
    const cached = getFromCache<MuroComment[]>("muro_comments")
    if (cached) {
      setComments(cached)
      setIsLoading(false)
      setTimeout(scrollToBottom, 50)
    }

    fetch("/api/muro")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setComments(data)
          setToCache("muro_comments", data)
          setTimeout(scrollToBottom, 50)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  // Cleanup waiting timeout on unmount
  useEffect(() => {
    return () => {
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
    }
  }, [])

  // Realtime: subscribe to INSERTs on muro_comments for instant updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("muro_comments_inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "muro_comments" },
        (payload) => {
          const newComment = payload.new as MuroComment
          if (!newComment?.id) return
          setComments((prev) => {
            if (prev.some((c) => c.id === newComment.id)) return prev
            // Si es nuestro propio comentario llegando por Realtime antes que la
            // respuesta del POST, sustituye al optimista temporal en vez de duplicarlo
            const withoutTemp = prev.filter(
              (c) => !(String(c.id).startsWith("temp-") && c.content === newComment.content && c.username === newComment.username)
            )
            const updated = [...withoutTemp, newComment]
            setToCache("muro_comments", updated)
            return updated
          })
          if (feedRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = feedRef.current
            if (scrollHeight - scrollTop - clientHeight < 80) {
              setTimeout(scrollToBottom, 50)
            }
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fallback polling every 15s in case Realtime drops the connection
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isPostingRef.current) return
      try {
        const res = await fetch("/api/muro")
        const data = await res.json()
        if (Array.isArray(data)) {
          setComments((prev) => {
            if (data.length !== prev.length || data[data.length - 1]?.id !== prev[prev.length - 1]?.id) {
              setToCache("muro_comments", data)
              if (feedRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = feedRef.current
                if (scrollHeight - scrollTop - clientHeight < 80) {
                  setTimeout(scrollToBottom, 50)
                }
              }
              return data
            }
            return prev
          })
        }
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom when mobile keyboard opens (viewport shrinks)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let prevHeight = vv.height

    const onResize = () => {
      const newHeight = vv.height
      // Keyboard opened (viewport got shorter) - scroll to bottom if user was at bottom
      if (newHeight < prevHeight && isAtBottomRef.current) {
        setTimeout(scrollToBottom, 50)
        setTimeout(scrollToBottom, 150)
      }
      prevHeight = newHeight
    }

    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // isPostingRef es sincrono: bloquea el doble submit en el mismo frame
    // (isSubmitting es estado y no se actualiza hasta el siguiente render)
    if (!message.trim() || isSubmitting || isPostingRef.current) return
    ensureAudioCtx()

    // Check for BSOD easter egg triggers
    const bsodMatch = checkBSODTrigger(message.trim())
    if (bsodMatch) {
      setMessage("")
      window.dispatchEvent(new CustomEvent("bsod", { detail: bsodMatch }))
      return
    }

    setError("")
    setIsSubmitting(true)

    const tempId = "temp-" + Date.now()
    const trimmedContent = message.trim()
    const trimmedUsername = username.trim()
    const optimisticComment: MuroComment = {
      id: tempId,
      username: trimmedUsername || sessionUsername || "anónimo",
      content: trimmedContent,
      created_at: new Date().toISOString(),
    }

    setComments((prev) => [...prev, optimisticComment])
    setMessage("")
    messageInputRef.current?.focus()
    setTimeout(scrollToBottom, 50)
    isPostingRef.current = true

    try {
      const res = await fetch("/api/muro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername || sessionUsername,
          content: trimmedContent,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al enviar")
        setComments((prev) => prev.filter((c) => c.id !== tempId))
        return
      }

      const { userComment } = await res.json()
      setComments((prev) => {
        // Si Realtime ya insertó el comentario real, solo retiramos el temporal
        if (prev.some((c) => c.id === userComment.id)) {
          return prev.filter((c) => c.id !== tempId)
        }
        return prev.map((c) => (c.id === tempId ? userComment : c))
      })
      waitingSinceRef.current = Date.now()
      setWaitingForNadie(true)
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
      waitingTimeoutRef.current = setTimeout(() => setWaitingForNadie(false), 15000)
    } catch {
      setError("Error de conexión")
      setComments((prev) => prev.filter((c) => c.id !== tempId))
    } finally {
      isPostingRef.current = false
      setIsSubmitting(false)
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "ahora"
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  const myUsername = username.trim() || sessionUsername

  // Detect new Nadie replies addressed to me. Each reply id is notified at most once:
  // hide "está pensando", highlight the reply, bump tab title (if hidden) and play sound.
  useEffect(() => {
    if (!myUsername) return
    const myMention = `@${myUsername} `
    const since = waitingSinceRef.current
    const freshReplies = comments.filter(
      (c) =>
        c.is_nadie &&
        c.content.startsWith(myMention) &&
        since > 0 &&
        new Date(c.created_at).getTime() >= since,
    )
    const newOnes = freshReplies.filter((c) => !notifiedReplyIdsRef.current.has(c.id))
    if (newOnes.length === 0) return

    for (const reply of newOnes) notifiedReplyIdsRef.current.add(reply.id)
    // Cap the set so it doesn't grow unboundedly across a long session.
    if (notifiedReplyIdsRef.current.size > 200) {
      const arr = Array.from(notifiedReplyIdsRef.current).slice(-100)
      notifiedReplyIdsRef.current = new Set(arr)
    }

    if (waitingForNadie) {
      setWaitingForNadie(false)
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current)
    }

    const latest = newOnes[newOnes.length - 1]
    setHighlightedReplyId(latest.id)
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    highlightTimeoutRef.current = setTimeout(() => setHighlightedReplyId(null), 5000)

    playNadieSound()

    if (typeof document !== "undefined" && document.hidden) {
      if (originalTitleRef.current === null) originalTitleRef.current = document.title
      unseenCountRef.current += newOnes.length
      document.title = `(${unseenCountRef.current}) Nadie te ha contestado`
    }
  }, [comments, waitingForNadie, myUsername])

  // Restore tab title when user returns
  useEffect(() => {
    if (typeof document === "undefined") return
    const onVisible = () => {
      if (!document.hidden && originalTitleRef.current !== null) {
        document.title = originalTitleRef.current
        originalTitleRef.current = null
        unseenCountRef.current = 0
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  const getUsernameClass = (c: MuroComment) => {
    if (c.is_nadie) return "text-xs font-bold shrink-0"
    if (c.username === myUsername) return "text-xs font-bold shrink-0 text-green-700"
    return "text-xs font-bold shrink-0 text-blue-800"
  }

  const renderContent = (c: MuroComment) => {
    if (c.is_nadie && c.content.startsWith("@")) {
      const spaceIdx = c.content.indexOf(" ")
      if (spaceIdx > 0) {
        const mention = c.content.slice(0, spaceIdx)
        const rest = c.content.slice(spaceIdx)
        const mentionedUser = mention.slice(1)
        const isMe = mentionedUser === myUsername
        return (
          <>
            <span className={`font-bold ${isMe ? "text-green-700" : "text-blue-800"}`}>{mention}</span>
            {rest}
          </>
        )
      }
    }
    return c.content
  }

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "Tahoma, sans-serif" }}>
      <div className="bg-[#ece9d8] px-3 py-2 border-b border-gray-400 text-xs text-gray-600 italic">
        ¿Qué os está pareciendo el disco?
      </div>

      <div
        ref={feedRef}
        className="flex-1 bg-white border border-gray-300 mx-1 mt-1 overflow-y-auto"
        style={{ minHeight: 0, overscrollBehavior: 'contain' }}
        onScroll={() => {
          if (feedRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = feedRef.current
            isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50
          }
        }}
      >
        {isLoading ? (
          <div className="p-3 text-center text-gray-400 text-xs">Cargando...</div>
        ) : comments.length === 0 ? (
          <div className="p-3 text-center text-gray-400 text-xs">Sé el primero en escribir</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {comments.map((c) => (
              <div key={c.id} className={`px-3 py-2 ${c.is_nadie ? "bg-yellow-50/30 hover:bg-yellow-50/50" : "hover:bg-blue-50/50"} ${c.id === highlightedReplyId ? "nadie-reply-highlight" : ""}`}>
                <div className="flex items-baseline gap-2">
                  <span className={getUsernameClass(c)} style={c.is_nadie ? { color: "#C4A43C" } : undefined}>@{c.username}</span>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-xs text-gray-800 mt-0.5 break-words">{renderContent(c)}</p>
              </div>
            ))}
            {waitingForNadie && (
              <div className="px-3 py-2 bg-yellow-50/30 italic">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold shrink-0" style={{ color: "#C4A43C" }}>@Nadie</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  está pensando<span className="nadie-dots" />
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-[#ece9d8] border-t border-gray-400 p-2">
        {error && (
          <div className="text-xs text-red-600 mb-1 px-1">{error}</div>
        )}
        <div className="flex gap-1.5 items-end">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 20))}
            placeholder="anónimo"
            className="w-[72px] shrink-0 text-[16px] sm:text-xs px-1.5 py-1 border border-gray-400 bg-white focus:outline-none focus:border-blue-500"
            maxLength={20}
          />
          <div className="flex-1 relative">
            <input
              ref={messageInputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 140))}
              placeholder="Escribe algo..."
              className="w-full text-[16px] sm:text-xs px-1.5 py-1 pr-10 border border-gray-400 bg-white focus:outline-none focus:border-blue-500"
              maxLength={140}
            />
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
              {message.length}/140
            </span>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            onMouseDown={(e) => e.preventDefault()}
            className="shrink-0 text-xs px-2 py-1 bg-[#d4d0c8] border border-gray-400 hover:bg-[#c8c4bc] active:bg-[#bfbbb3] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #808080",
            }}
          >
            {isSubmitting ? "..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  )
}
