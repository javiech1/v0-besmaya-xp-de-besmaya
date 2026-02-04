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

interface Festival {
  id: string
  fecha: string
  ciudad: string
  sala: string
  link: string
}

type TabType = 'conciertos' | 'festivales'

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

const fallbackFestivals: Festival[] = []

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

function sortFestivalsChronologically(festivals: Festival[]): Festival[] {
  return [...festivals].sort((a, b) => {
    const dateA = parseFechaToDate(a.fecha)
    const dateB = parseFechaToDate(b.fecha)
    return dateA.getTime() - dateB.getTime()
  })
}

export default function ConciertosPage() {
  const [time, setTime] = useState("")
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('conciertos')
  const [concerts, setConcerts] = useState<Concert[]>(sortConcertsChronologically(fallbackConcerts))
  const [isLoading, setIsLoading] = useState(true)
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [isFestivalsLoading, setIsFestivalsLoading] = useState(true)
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
    fetchFestivals()
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
    // Try cache first
    try {
      const cached = localStorage.getItem('concerts_cache')
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setConcerts(sortConcertsChronologically(data))
          setIsLoading(false)
          return
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Fetch from Supabase
    try {
      const { data, error } = await supabase.from("concerts").select("*")

      if (error) {
        console.log("Database not ready, using fallback data:", error.message)
        setConcerts(sortConcertsChronologically(fallbackConcerts))
      } else {
        const sortedData = sortConcertsChronologically(data || fallbackConcerts)
        setConcerts(sortedData)
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

  const fetchFestivals = async () => {
    // Try cache first
    try {
      const cached = localStorage.getItem('festivals_cache')
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setFestivals(sortFestivalsChronologically(data))
          setIsFestivalsLoading(false)
          return
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Fetch from Supabase
    try {
      const { data, error } = await supabase.from("festis").select("*")

      if (error) {
        console.log("Festivals database not ready, using fallback data:", error.message)
        setFestivals(sortFestivalsChronologically(fallbackFestivals))
      } else {
        const sortedData = sortFestivalsChronologically(data || fallbackFestivals)
        setFestivals(sortedData)
        try {
          localStorage.setItem('festivals_cache', JSON.stringify({
            data: data || fallbackFestivals,
            timestamp: Date.now()
          }))
        } catch {
          // Ignore storage errors
        }
      }
    } catch (error) {
      console.log("Error fetching festivals, using fallback data:", error)
      setFestivals(sortFestivalsChronologically(fallbackFestivals))
    } finally {
      setIsFestivalsLoading(false)
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
        <div className="absolute inset-x-0 top-0 bottom-12 sm:bottom-10 p-2 sm:p-8">
          <div className="h-full bg-white border-2 border-gray-400 shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-2 sm:p-3 border-b border-blue-400 flex-shrink-0">
              <h1 className="font-bold text-center text-lg sm:text-2xl">LA GIRA DE NADIE</h1>
            </div>
            <div
              className="p-2 sm:p-3 md:p-6 flex-1 overflow-auto"
              style={{ containerType: 'inline-size', containerName: 'concert-list' }}
            >
              <div className="grid gap-2 sm:gap-3 md:gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="concert-row animate-pulse">
                    <div className="h-4 w-12 bg-gray-300 rounded" />
                    <div className="h-4 w-16 bg-gray-300 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded flex-1" />
                    <div className="h-6 w-14 bg-green-200 rounded" />
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
      <div className="absolute inset-x-0 top-0 bottom-12 sm:bottom-10 p-2 sm:p-8">
        <div className="h-full bg-white border-2 border-gray-400 shadow-2xl flex flex-col overflow-hidden">
          {/* Window title bar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-2 sm:p-3 border-b border-blue-400 flex justify-between items-center flex-shrink-0">
            <h1 className="font-bold text-center text-lg sm:text-2xl flex-1">LA GIRA DE NADIE</h1>
            <button
              onClick={handleClose}
              className="ml-2 sm:ml-4 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 hover:bg-red-600 border border-red-700 rounded-sm flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm transition-colors"
              title="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Tabs and content with container query */}
          <div
            className="p-2 sm:p-3 md:p-6 pb-0 flex-1 flex flex-col overflow-hidden"
            style={{ containerType: 'inline-size', containerName: 'concert-list' }}
          >
            {/* XP Tabs */}
            <div className="xp-tabs-container flex-shrink-0">
              <button
                className={`xp-tab ${activeTab === 'conciertos' ? 'active' : ''}`}
                onClick={() => setActiveTab('conciertos')}
              >
                Conciertos
              </button>
              <button
                className={`xp-tab ${activeTab === 'festivales' ? 'active' : ''}`}
                onClick={() => setActiveTab('festivales')}
              >
                Festivales
              </button>
            </div>

            {/* Tab content */}
            <div className="xp-tab-content flex-1 overflow-auto">
              {/* Panel de Conciertos */}
              <div className={`xp-tab-panel ${activeTab === 'conciertos' ? 'active' : ''}`}>
                <div className="grid gap-2 sm:gap-3 md:gap-4">
                  {concerts.map((concert) => (
                    <div key={concert.id} className="concert-row">
                      <span className="concert-fecha">{concert.fecha}</span>
                      <span className="concert-ciudad">{concert.ciudad}</span>
                      <span className="concert-sala">{concert.sala}</span>
                      <button
                        className="concert-btn"
                        onClick={() => window.open(concert.link, "_blank")}
                      >
                        Tickets
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 sm:mt-6 text-center">
                  <p className="text-gray-600 text-xs sm:text-sm italic">Muchos más por confirmar</p>
                </div>
              </div>

              {/* Panel de Festivales */}
              <div className={`xp-tab-panel ${activeTab === 'festivales' ? 'active' : ''}`}>
                {isFestivalsLoading ? (
                  <div className="grid gap-2 sm:gap-3 md:gap-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="concert-row animate-pulse">
                        <div className="h-4 w-12 bg-gray-300 rounded" />
                        <div className="h-4 w-16 bg-gray-300 rounded" />
                        <div className="h-4 w-20 bg-gray-200 rounded flex-1" />
                        <div className="h-6 w-14 bg-green-200 rounded" />
                      </div>
                    ))}
                  </div>
                ) : festivals.length > 0 ? (
                  <div className="grid gap-2 sm:gap-3 md:gap-4">
                    {festivals.map((festival) => (
                      <div key={festival.id} className="concert-row">
                        <span className="concert-fecha">{festival.fecha}</span>
                        <span className="concert-ciudad">{festival.ciudad}</span>
                        <span className="concert-sala">{festival.sala}</span>
                        <button
                          className="concert-btn"
                          onClick={() => window.open(festival.link, "_blank")}
                        >
                          Tickets
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-sm">No hay festivales confirmados todavía</p>
                  </div>
                )}
                <div className="mt-4 sm:mt-6 text-center">
                  <p className="text-gray-600 text-xs sm:text-sm italic">Más festivales por confirmar</p>
                </div>
              </div>
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
