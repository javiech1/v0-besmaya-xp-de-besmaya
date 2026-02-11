"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getUserLocation, findNearbyConcert } from "@/lib/geolocation"
import { createClient } from "@/lib/supabase/client"
import { getFromCache, setToCache, parseFechaToDate } from "@/lib/cache"

interface Event {
  id: string
  fecha: string
  ciudad: string
  sala: string
  link: string
}

const fallbackConcerts: Event[] = [
  { id: "1", fecha: "30-ene", ciudad: "Valencia", sala: "Palau Alameda", link: "https://merchandtour.com/besmaya/" },
  { id: "2", fecha: "31-ene", ciudad: "Zaragoza", sala: "Sala Oasis", link: "https://merchandtour.com/besmaya/" },
  { id: "3", fecha: "06-feb", ciudad: "A Coruña", sala: "Sala INN", link: "https://merchandtour.com/besmaya/" },
  { id: "4", fecha: "07-feb", ciudad: "Oviedo", sala: "Sala Tribeca", link: "https://merchandtour.com/besmaya/" },
  { id: "5", fecha: "13-feb", ciudad: "Madrid", sala: "Live Las Ventas", link: "https://merchandtour.com/besmaya/" },
  { id: "6", fecha: "19-feb", ciudad: "Murcia", sala: "Sala REM", link: "https://merchandtour.com/besmaya/" },
  { id: "7", fecha: "05-mar", ciudad: "Granada", sala: "Sala El tren", link: "https://merchandtour.com/besmaya/" },
  { id: "8", fecha: "06-mar", ciudad: "Córdoba", sala: "Sala Impala", link: "https://merchandtour.com/besmaya/" },
  { id: "9", fecha: "19-mar", ciudad: "Pamplona", sala: "Sala Zentral", link: "https://merchandtour.com/besmaya/" },
  { id: "10", fecha: "21-mar", ciudad: "Valladolid", sala: "Sala Lava", link: "https://merchandtour.com/besmaya/" },
]

export function ConcertNotificationBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [sliding, setSliding] = useState<"in" | "out" | "idle">("idle")
  const router = useRouter()

  useEffect(() => {
    if (dismissed) return

    // Don't show again if already shown this session
    if (sessionStorage.getItem("concert_notification_shown") === "true") {
      setDismissed(true)
      return
    }

    let cancelled = false

    const checkNearbyConcerts = async () => {
      try {
        // Small delay before requesting geolocation so the Nadie notification
        // appears first and the permission prompt doesn't interfere
        await new Promise(r => setTimeout(r, 5000))
        if (cancelled) return

        const location = await getUserLocation()
        if (cancelled) return

        // Get concerts from cache or Supabase
        let concerts: Event[] = fallbackConcerts
        const cached = getFromCache<Event[]>('concerts_cache')
        if (cached) {
          concerts = cached
        } else {
          try {
            const supabase = createClient()
            const { data, error } = await supabase.from("concerts").select("*")
            if (!error && data) {
              concerts = data
              setToCache('concerts_cache', data)
            }
          } catch {
            // Use fallback
          }
        }

        // Filter past events
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const futureConcerts = concerts.filter(c => parseFechaToDate(c.fecha) >= today)

        const result = findNearbyConcert(location.lat, location.lon, futureConcerts, 100)

        if (result && !cancelled) {
          // Store for the concerts page
          sessionStorage.setItem("nearby_concert_city", result.concert.ciudad)

          // Show notification after a short delay
          setTimeout(() => {
            if (!cancelled) {
              setVisible(true)
              setSliding("in")
              setTimeout(() => setSliding("idle"), 400)
            }
          }, 2000)
        }
      } catch {
        // Geolocation denied or failed - don't show notification
      }
    }

    checkNearbyConcerts()

    return () => {
      cancelled = true
    }
  }, [dismissed])

  const handleDismiss = useCallback(() => {
    setSliding("out")
    sessionStorage.setItem("concert_notification_shown", "true")
    setTimeout(() => {
      setVisible(false)
      setDismissed(true)
    }, 350)
  }, [])

  const handleOpenConcerts = useCallback(() => {
    router.push("/conciertos")
    handleDismiss()
  }, [router, handleDismiss])

  if (!visible && sliding !== "out") return null

  return (
    <div
      className={`y2k-notification y2k-notification-concert ${
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
          <img src="/icons/conciertos.png" alt="" width={28} height={28} style={{ objectFit: "contain" }} />
        </div>
        <div className="y2k-notification-message">
          <span className="y2k-notification-sender">Los Besmaya</span>{" "}
          <span className="y2k-notification-text">van a tu ciudad</span>
        </div>
      </div>

      {/* Action */}
      <div className="y2k-notification-actions">
        <button className="y2k-notification-btn" onClick={handleOpenConcerts}>
          Ver conciertos
        </button>
      </div>
    </div>
  )
}
