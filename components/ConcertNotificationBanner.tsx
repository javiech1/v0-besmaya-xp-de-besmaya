"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { getUserLocation, findAllNearbyConcerts } from "@/lib/geolocation"
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

interface ConcertNotificationBannerProps {
  nadieVisible: boolean
  albumVisible?: boolean
  isMobile?: boolean
}

export function ConcertNotificationBanner({ nadieVisible, albumVisible = false, isMobile = false }: ConcertNotificationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [sliding, setSliding] = useState<"in" | "out" | "idle">("idle")
  const [isGiraFallback, setIsGiraFallback] = useState(false)
  const router = useRouter()
  const mountTimeRef = useRef(Date.now())

  useEffect(() => {
    if (dismissed) return

    // Don't show again if already shown this session
    try {
      if (sessionStorage.getItem("concert_notification_shown") === "true") {
        setDismissed(true)
        return
      }
    } catch {
      // sessionStorage not available
    }

    let cancelled = false

    const checkNearbyEvents = async () => {
      try {
        const location = await getUserLocation()
        if (cancelled) return

        // Get concerts from cache or Supabase
        let concerts: Event[] = fallbackConcerts
        let festivals: Event[] = []

        try {
          const cachedConcerts = getFromCache<Event[]>('concerts_cache')
          if (cachedConcerts) {
            concerts = cachedConcerts
          } else {
            const supabase = createClient()
            const { data, error } = await supabase.from("concerts").select("*")
            if (!error && data) {
              concerts = data
              setToCache('concerts_cache', data)
            }
          }
        } catch {
          // Use fallback concerts
        }

        try {
          const cachedFestivals = getFromCache<Event[]>('festivals_cache')
          if (cachedFestivals) {
            festivals = cachedFestivals
          } else {
            const supabase = createClient()
            const { data, error } = await supabase.from("festis").select("*")
            if (!error && data) {
              festivals = data
              setToCache('festivals_cache', data)
            }
          }
        } catch {
          // No festivals available
        }

        if (cancelled) return

        // Filter past events
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const futureConcerts = concerts.filter(c => parseFechaToDate(c.fecha) >= today)
        const futureFestivals = festivals.filter(f => parseFechaToDate(f.fecha) >= today)

        // Find ALL nearby events (concerts + festivals)
        const nearbyConcerts = findAllNearbyConcerts(location.lat, location.lon, futureConcerts, 100)
        const nearbyFestivals = findAllNearbyConcerts(location.lat, location.lon, futureFestivals, 100)

        const allNearbyResults = [...nearbyConcerts, ...nearbyFestivals]

        if (allNearbyResults.length > 0 && !cancelled) {
          // Extract unique city names
          const nearbyCities = [...new Set(allNearbyResults.map(r => r.concert.ciudad))]

          // Store for the concerts page
          try {
            sessionStorage.setItem("nearby_concert_cities", JSON.stringify(nearbyCities))
          } catch {
            // sessionStorage not available
          }

          // Show notification ~1s after page load (or immediately if geo took longer)
          const elapsed = Date.now() - mountTimeRef.current
          const delay = Math.max(0, 1000 - elapsed)

          setTimeout(() => {
            if (!cancelled) {
              setIsGiraFallback(false)
              setVisible(true)
              setSliding("in")
              setTimeout(() => setSliding("idle"), 400)
            }
          }, delay)
        } else if (isMobile && !cancelled) {
          // En móvil, si no hay conciertos cerca, mostrar notificación de la gira
          const elapsed = Date.now() - mountTimeRef.current
          const delay = Math.max(0, 1000 - elapsed)

          setTimeout(() => {
            if (!cancelled) {
              setIsGiraFallback(true)
              setVisible(true)
              setSliding("in")
              setTimeout(() => setSliding("idle"), 400)
            }
          }, delay)
        }
      } catch {
        // Geolocation denied or failed
        // En móvil, mostrar la notificación de gira como fallback
        if (isMobile && !cancelled) {
          const elapsed = Date.now() - mountTimeRef.current
          const delay = Math.max(0, 1000 - elapsed)

          setTimeout(() => {
            if (!cancelled) {
              setIsGiraFallback(true)
              setVisible(true)
              setSliding("in")
              setTimeout(() => setSliding("idle"), 400)
            }
          }, delay)
        }
      }
    }

    checkNearbyEvents()

    return () => {
      cancelled = true
    }
  }, [dismissed, isMobile])

  const handleDismiss = useCallback(() => {
    setSliding("out")
    try {
      sessionStorage.setItem("concert_notification_shown", "true")
    } catch {
      // sessionStorage not available
    }
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

  // Determine CSS class based on how many notifications are above
  let positionClass = 'y2k-notification-concert'
  if (albumVisible) {
    // Both nadie and album are above
    positionClass = 'y2k-notification-concert y2k-notification-concert-below-album'
    if (!nadieVisible) {
      positionClass = 'y2k-notification-concert y2k-notification-concert-below-album y2k-notification-album-top'
    }
  }

  return (
    <div
      className={`y2k-notification ${positionClass} ${
        !albumVisible && !nadieVisible ? 'y2k-notification-top' : ''
      } ${
        !albumVisible && nadieVisible ? '' : ''
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
          <img src="/icons/conciertos.png" alt="" width={28} height={28} style={{ objectFit: "contain" }} />
        </div>
        <div className="y2k-notification-message">
          {isGiraFallback ? (
            <span className="y2k-notification-text">La gira de Nadie</span>
          ) : (
            <>
              <span className="y2k-notification-sender">Los Besmaya</span>{" "}
              <span className="y2k-notification-text">van a tu ciudad</span>
            </>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="y2k-notification-actions">
        <button className="y2k-notification-btn" onClick={handleOpenConcerts}>
          {isGiraFallback ? "Comprar Entradas" : "Ver conciertos"}
        </button>
      </div>
    </div>
  )
}
