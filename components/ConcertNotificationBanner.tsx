"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { getUserLocation, findAllNearbyConcerts, checkGeolocationPermission, getBrowserLocation } from "@/lib/geolocation"
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
  // 'nearby' = found nearby concerts, 'gira' = generic fallback
  const [mode, setMode] = useState<"nearby" | "gira">("gira")
  const router = useRouter()
  const mountTimeRef = useRef(Date.now())
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile
  const cancelledRef = useRef(false)

  // Helper: fetch event data from cache or Supabase
  const getEventData = useCallback(async () => {
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
    } catch { /* Use fallback */ }

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
    } catch { /* No festivals */ }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return {
      concerts: concerts.filter(c => parseFechaToDate(c.fecha) >= today),
      festivals: festivals.filter(f => parseFechaToDate(f.fecha) >= today),
    }
  }, [])

  // Helper: given a location, find nearby events and show notification
  const processLocation = useCallback(async (location: { lat: number; lon: number }) => {
    if (cancelledRef.current) return false
    const { concerts, festivals } = await getEventData()
    if (cancelledRef.current) return false

    const nearbyConcerts = findAllNearbyConcerts(location.lat, location.lon, concerts, 100)
    const nearbyFestivals = findAllNearbyConcerts(location.lat, location.lon, festivals, 100)
    const allNearby = [...nearbyConcerts, ...nearbyFestivals]

    if (allNearby.length > 0) {
      const nearbyCities = [...new Set(allNearby.map(r => r.concert.ciudad))]
      try { sessionStorage.setItem("nearby_concert_cities", JSON.stringify(nearbyCities)) } catch {}
      return true // found nearby events
    }
    return false // no nearby events
  }, [getEventData])

  // Helper: show the notification with a delay relative to mount time
  const showWithDelay = useCallback((notificationMode: "nearby" | "gira") => {
    const elapsed = Date.now() - mountTimeRef.current
    const delay = Math.max(0, 1000 - elapsed)
    setTimeout(() => {
      if (!cancelledRef.current) {
        setMode(notificationMode)
        setVisible(true)
        setSliding("in")
        setTimeout(() => setSliding("idle"), 400)
      }
    }, delay)
  }, [])

  useEffect(() => {
    if (dismissed) return

    try {
      if (sessionStorage.getItem("concert_notification_shown") === "true") {
        setDismissed(true)
        return
      }
    } catch {}

    cancelledRef.current = false

    const checkNearbyEvents = async () => {
      // 1. Try IP geolocation
      let ipLocation: { lat: number; lon: number } | null = null
      try {
        ipLocation = await getUserLocation()
      } catch {
        // IP geo failed entirely
      }

      if (cancelledRef.current) return

      // 2. If IP geo worked, check for nearby events
      if (ipLocation) {
        const found = await processLocation(ipLocation)
        if (cancelledRef.current) return
        if (found) {
          showWithDelay("nearby")
          return
        }
        // IP geo gave a location but no nearby events — show gira on mobile
        if (isMobileRef.current) {
          showWithDelay("gira")
        }
        return
      }

      // 3. IP geo failed — try silent GPS if permission already granted
      const permission = await checkGeolocationPermission()
      if (cancelledRef.current) return

      if (permission === 'granted') {
        // Permission already granted — use GPS silently
        try {
          const gpsLocation = await getBrowserLocation()
          if (cancelledRef.current) return
          const found = await processLocation(gpsLocation)
          if (cancelledRef.current) return
          if (found) {
            showWithDelay("nearby")
            return
          }
        } catch {
          // GPS failed even though granted
        }
        if (isMobileRef.current) showWithDelay("gira")
      } else if (permission === 'prompt') {
        // Permission not yet decided — trigger native browser GPS prompt directly
        try {
          const gpsLocation = await getBrowserLocation()
          if (cancelledRef.current) return
          const found = await processLocation(gpsLocation)
          if (cancelledRef.current) return
          if (found) {
            showWithDelay("nearby")
            return
          }
        } catch {
          // User denied or GPS failed
        }
        if (isMobileRef.current) showWithDelay("gira")
      } else {
        // Permission denied — fallback
        if (isMobileRef.current) showWithDelay("gira")
      }
    }

    checkNearbyEvents()

    return () => { cancelledRef.current = true }
  }, [dismissed, processLocation, showWithDelay])

  const handleDismiss = useCallback(() => {
    setSliding("out")
    try {
      sessionStorage.setItem("concert_notification_shown", "true")
    } catch {}
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
          {mode === "nearby" ? (
            <>
              <span className="y2k-notification-sender">Los Besmaya</span>{" "}
              <span className="y2k-notification-text">van a tu ciudad</span>
            </>
          ) : (
            <span className="y2k-notification-text">La gira de Nadie</span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="y2k-notification-actions">
        <button className="y2k-notification-btn" onClick={handleOpenConcerts}>
          {mode === "gira" ? "Comprar Entradas" : "Ver conciertos"}
        </button>
      </div>
    </div>
  )
}
