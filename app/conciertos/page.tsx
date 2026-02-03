"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Concert {
  id: string
  fecha: string
  ciudad: string
  sala: string
  link: string
}

const fallbackConcerts: Concert[] = [
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

function parseFechaToDate(fecha: string): Date {
  const monthMap: { [key: string]: number } = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dic: 11,
  }

  const parts = fecha.split("-")
  if (parts.length !== 2) return new Date()

  const day = Number.parseInt(parts[0], 10)
  const month = monthMap[parts[1].toLowerCase()]

  if (isNaN(day) || month === undefined) return new Date()

  return new Date(2026, month, day)
}

function sortConcertsChronologically(concerts: Concert[]): Concert[] {
  return [...concerts].sort((a, b) => {
    const dateA = parseFechaToDate(a.fecha)
    const dateB = parseFechaToDate(b.fecha)
    return dateA.getTime() - dateB.getTime()
  })
}

export default function ConciertosPage() {
  const [time, setTime] = useState("")
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)
  const [concerts, setConcerts] = useState<Concert[]>(() => {
    // Try to load from cache first
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('concerts_cache')
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          // Use cache if less than 5 minutes old
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return sortConcertsChronologically(data)
          }
        }
      } catch {
        // Ignore cache errors
      }
    }
    return sortConcertsChronologically(fallbackConcerts)
  })
  const [isLoading, setIsLoading] = useState(() => {
    // Skip loading if we have cached data
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('concerts_cache')
        if (cached) {
          const { timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return false
          }
        }
      } catch {
        // Ignore cache errors
      }
    }
    return true
  })
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchConcerts()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isStartMenuOpen && !target.closest(".start-menu") && !target.closest(".xp-start-btn")) {
        setIsStartMenuOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [isStartMenuOpen])

  const fetchConcerts = async () => {
    try {
      const { data, error } = await supabase.from("concerts").select("*")

      if (error) {
        console.log("Database not ready, using fallback data:", error.message)
        setConcerts(sortConcertsChronologically(fallbackConcerts))
      } else {
        const sortedData = sortConcertsChronologically(data || fallbackConcerts)
        setConcerts(sortedData)
        // Save to cache
        try {
          localStorage.setItem('concerts_cache', JSON.stringify({
            data: data || fallbackConcerts,
            timestamp: Date.now()
          }))
        } catch {
          // Ignore storage errors
        }
      }
    } catch (error) {
      console.log("Error fetching concerts, using fallback data:", error)
      setConcerts(sortConcertsChronologically(fallbackConcerts))
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStartMenu = () => {
    setIsStartMenuOpen(!isStartMenuOpen)
  }

  const handleClose = () => {
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen relative overflow-hidden">
        <img
          src="/xp-bliss-custom.jpg"
          alt="Windows XP Bliss Wallpaper"
          className="absolute inset-0 w-full h-full object-cover -z-10"
        />
        <div className="absolute inset-0 pb-10 p-8">
          <div className="h-full bg-white border-2 border-gray-400 shadow-2xl overflow-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 border-b border-blue-400">
              <h1 className="font-bold text-center text-2xl">LA GIRA DE NADIE</h1>
            </div>
            <div className="p-3 md:p-6">
              <div className="grid gap-3 md:gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-300 rounded p-3 md:p-4 animate-pulse">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                        <div className="h-5 w-16 bg-gray-300 rounded" />
                        <div className="h-6 w-24 bg-gray-300 rounded" />
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                      </div>
                      <div className="h-10 w-24 bg-green-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="xp-taskbar">
          <button className="xp-start-btn" disabled>
            <img src="/icons/sistema-operativo.png" alt="Start" width={16} height={16} className="mr-1" />
            start
          </button>
          <div className="xp-taskbar-buttons">
            <button className="xp-taskbar-btn active">La gira de Nadie - Tour Dates</button>
          </div>
          <div className="xp-clock text-white">--:--</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <img
        src="/xp-bliss-custom.jpg"
        alt="Windows XP Bliss Wallpaper"
        className="absolute inset-0 w-full h-full object-cover -z-10"
      />

      {/* Full screen concert list */}
      <div className="absolute inset-0 pb-10 p-8">
        <div className="h-full bg-white border-2 border-gray-400 shadow-2xl overflow-auto">
          {/* Window title bar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 border-b border-blue-400 flex justify-between items-center">
            <h1 className="font-bold text-center text-2xl flex-1">LA GIRA DE NADIE</h1>
            <button
              onClick={handleClose}
              className="ml-4 w-6 h-6 bg-red-500 hover:bg-red-600 border border-red-700 rounded-sm flex items-center justify-center text-white font-bold text-sm shadow-sm transition-colors"
              title="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Concert list */}
          <div className="p-3 md:p-6">
            <div className="grid gap-3 md:gap-4">
              {concerts.map((concert) => (
                <div
                  key={concert.id}
                  className="bg-gray-50 border border-gray-300 rounded p-3 md:p-4 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <div className="text-base md:text-lg font-mono font-bold text-gray-800 sm:min-w-[80px]">
                        {concert.fecha}
                      </div>
                      <div className="text-lg md:text-xl font-bold text-black text-center">{concert.ciudad}</div>
                      <div className="text-sm md:text-lg text-gray-600">{concert.sala}</div>
                    </div>
                    <button
                      className="px-4 py-2 md:px-6 md:py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded border border-green-700 shadow-md transition-colors text-sm md:text-base w-full sm:w-auto"
                      onClick={() => window.open(concert.link, "_blank")}
                    >
                      Tickets
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm italic">Muchos más por confirmar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Start Menu */}
      {isStartMenuOpen && (
        <div className="start-menu fixed bottom-10 left-0 z-50">
          <div className="bg-gradient-to-b from-blue-600 to-blue-800 border-2 border-gray-400 rounded-tr-lg shadow-2xl w-80 h-96">
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-3 rounded-tr-lg border-b border-blue-400">
              <div className="flex items-center space-x-3">
                <img src="/nadie.jpg" alt="nadie" className="w-12 h-12 rounded border-2 border-white object-cover" />
                <span className="text-white font-bold text-lg">nadie</span>
              </div>
            </div>

            <div className="flex h-80">
              <div className="w-1/2 bg-white border-r border-gray-300 p-2">
                <div className="space-y-1">
                  <Link href="/" className="flex items-center space-x-2 p-2 hover:bg-blue-100 cursor-pointer rounded">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">🏠</span>
                    </div>
                    <span className="text-sm">Inicio</span>
                  </Link>
                </div>
              </div>

              <div className="w-1/2 bg-blue-50 p-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 p-2 hover:bg-blue-100 cursor-pointer rounded">
                    <div className="w-6 h-6 bg-red-400 rounded flex items-center justify-center">
                      <span className="text-xs">🎨</span>
                    </div>
                    <span className="text-sm">Paint</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 p-2 flex justify-between items-center">
              <button className="flex items-center space-x-2 px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm">
                <span>🔓</span>
                <span>Log Off</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm">
                <span>⏻</span>
                <span>Turn Off</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Windows XP Taskbar */}
      <div className="xp-taskbar">
        <button className="xp-start-btn" onClick={toggleStartMenu} disabled>
          <img src="/icons/sistema-operativo.png" alt="Start" width={16} height={16} className="mr-1" />
          start
        </button>

        <div className="xp-taskbar-buttons">
          <button className="xp-taskbar-btn active">La gira de Nadie - Tour Dates</button>
        </div>

        <div className="xp-clock text-white">{time}</div>
      </div>
    </div>
  )
}
