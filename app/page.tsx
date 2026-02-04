"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface WindowState {
  id: string
  title: string
  content: React.ReactNode
  x: number
  y: number
  width: number
  height: number | "auto"
  isMinimized: boolean
  zIndex: number
  isInitial?: boolean
}

interface DragState {
  isDragging: boolean
  windowId: string | null
  startX: number
  startY: number
  startWindowX: number
  startWindowY: number
}

export default function BesmayaDesktop() {
  const [windows, setWindows] = useState<WindowState[]>([])
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    windowId: null,
    startX: 0,
    startY: 0,
    startWindowX: 0,
    startWindowY: 0,
  })
  const [time, setTime] = useState("")
  const [nextZIndex, setNextZIndex] = useState(100)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [lastClickedIcon, setLastClickedIcon] = useState<string | null>(null)
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)
  const [isUnderConstruction, setIsUnderConstruction] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isDesktopDetermined, setIsDesktopDetermined] = useState(false)
  const [initialWindowsCreated, setInitialWindowsCreated] = useState(false)
  const [spotifyPrefetched, setSpotifyPrefetched] = useState(false)
  const [concertsPreloaded, setConcertsPreloaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 640)
      setIsDesktopDetermined(true)
    }
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

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
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.windowId) return

      const deltaX = e.clientX - dragState.startX
      const deltaY = e.clientY - dragState.startY

      setWindows((prev) =>
        prev.map((windowItem) =>
          windowItem.id === dragState.windowId
            ? {
                ...windowItem,
                x: Math.max(0, Math.min(window.innerWidth - windowItem.width, dragState.startWindowX + deltaX)),
                y: Math.max(0, Math.min(window.innerHeight - (typeof windowItem.height === "number" ? windowItem.height : 400) - 40, dragState.startWindowY + deltaY)),
              }
            : windowItem,
        ),
      )
    }

    const handleMouseUp = () => {
      setDragState((prev) => ({ ...prev, isDragging: false, windowId: null }))
    }

    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragState])

  useEffect(() => {
    // Wait until isDesktop has been properly determined
    if (!isDesktopDetermined) return
    if (initialWindowsCreated) return

    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1024
    const screenHeight = typeof window !== "undefined" ? window.innerHeight : 768

    // En móvil: mostrar las 2 ventanas apiladas debajo de los iconos
    if (!isDesktop) {
      const initialWindows: WindowState[] = [
        {
          id: "welcome-poster",
          title: "FEED",
          content: <WelcomePosterContent />,
          x: 0,
          y: 0,
          width: screenWidth,
          height: "auto",
          isMinimized: false,
          zIndex: 102,
          isInitial: true,
        },
        {
          id: "album",
          title: "La vida de Nadie",
          content: <AlbumContent />,
          x: 0,
          y: 0,
          width: screenWidth,
          height: "auto",
          isMinimized: false,
          zIndex: 101,
          isInitial: true,
        },
      ]
      setWindows(initialWindows)
      setNextZIndex(103)
      setInitialWindowsCreated(true)
      return
    }

    // Desktop: dos ventanas en cascada
    const feedWidth = 384
    const albumWidth = 384
    const feedEstimatedHeight = 550
    const albumEstimatedHeight = 460

    const initialWindows: WindowState[] = [
      {
        id: "welcome-poster",
        title: "FEED",
        content: <WelcomePosterContent />,
        x: screenWidth / 2 - feedWidth / 2 - 200,
        y: screenHeight / 2 - feedEstimatedHeight / 2 - 80,
        width: feedWidth,
        height: "auto",
        isMinimized: false,
        zIndex: 101,
      },
      {
        id: "album",
        title: "La vida de Nadie",
        content: <AlbumContent />,
        x: screenWidth / 2 - albumWidth / 2 + 200,
        y: screenHeight / 2 - albumEstimatedHeight / 2 + 120,
        width: albumWidth,
        height: "auto",
        isMinimized: false,
        zIndex: 102,
      },
    ]

    setWindows(initialWindows)
    setNextZIndex(103)
    setInitialWindowsCreated(true)
  }, [isDesktop, isDesktopDetermined, initialWindowsCreated])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault()
        setIsUnderConstruction(!isUnderConstruction)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isUnderConstruction])

  const openWindow = (id: string, title: string, content: React.ReactNode) => {
    const existingWindow = windows.find((w) => w.id === id)
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w)))
        setNextZIndex((prev) => prev + 1)
      } else {
        focusWindow(id)
      }
      return
    }

    let windowWidth = 600
    let windowHeight = 400

    if (id === "musica") {
      windowWidth = 306
      windowHeight = 388
    }
    if (id === "welcome") {
      windowWidth = 420
      windowHeight = 520
    }
    if (id === "welcome-mobile") {
      windowWidth = 350
      windowHeight = 600
    }
    if (id === "paint") {
      windowWidth = 500
      windowHeight = 500
    }

    const newWindow: WindowState = {
      id,
      title,
      content,
      x: 100 + windows.length * 30,
      y: 100 + windows.length * 30,
      width: windowWidth,
      height: windowHeight,
      isMinimized: false,
      zIndex: nextZIndex,
    }

    setWindows((prev) => [...prev, newWindow])
    setNextZIndex((prev) => prev + 1)
  }

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)))
  }, [])

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex } : w)))
    setNextZIndex((prev) => prev + 1)
  }, [nextZIndex])

  const startDrag = (e: React.MouseEvent, windowId: string) => {
    // Desactivar drag en móvil - las ventanas son fullscreen
    if (!isDesktop) return

    const windowItem = windows.find((w) => w.id === windowId)
    if (!windowItem) return

    setDragState({
      isDragging: true,
      windowId,
      startX: e.clientX,
      startY: e.clientY,
      startWindowX: windowItem.x,
      startWindowY: windowItem.y,
    })
    focusWindow(windowId)
  }

  const handleIconClick = (iconId: string) => {
    switch (iconId) {
      case "merchan":
        window.open("https://merchandtour.com/besmaya/", "_blank")
        break
      case "musica":
        if (!isDesktop) {
          // En móvil, abrir Spotify (app si instalada, o web player)
          window.location.href = "https://open.spotify.com/playlist/0iXYV9B7pvlsZKqJEfOk5V"
        } else {
          openWindow("musica", "Música", <MusicaContent />)
        }
        break
      case "bio":
        openWindow("bio", "Bio", <BioContent />)
        break
      case "conciertos":
        router.push("/conciertos")
        break
      case "videos":
        window.open("https://www.youtube.com/@BESMAYA", "_blank")
        break
      case "paint":
        openWindow("paint", "Paint", <PaintContent />)
        break
    }
    setSelectedIcon(null)
  }

  const toggleStartMenu = () => {
    setIsStartMenuOpen(!isStartMenuOpen)
  }

  const prefetchSpotify = useCallback(() => {
    if (!spotifyPrefetched) {
      setSpotifyPrefetched(true)
    }
  }, [spotifyPrefetched])

  const prefetchConciertos = useCallback(async () => {
    router.prefetch('/conciertos')

    if (concertsPreloaded) return
    setConcertsPreloaded(true)

    try {
      const supabase = createClient()
      const { data } = await supabase.from("concerts").select("*")
      if (data) {
        localStorage.setItem('concerts_cache', JSON.stringify({
          data,
          timestamp: Date.now()
        }))
      }
    } catch {
      // Silent fail - conciertos page will fetch if needed
    }
  }, [router, concertsPreloaded])

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

  if (isUnderConstruction) {
    return <UnderConstructionPage onToggle={() => setIsUnderConstruction(false)} />
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <img
        src="/xp-bliss-custom.jpg"
        alt="Windows XP Bliss Wallpaper"
        className="absolute inset-0 w-full h-full object-cover -z-10"
      />

      <div className="desktop-icons absolute top-8 left-8 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-5 h-max">
        <div
          className={`desktop-icon ${selectedIcon === "conciertos" ? "selected" : ""}`}
          onClick={() => handleIconClick("conciertos")}
          onMouseEnter={prefetchConciertos}
        >
          <div className="desktop-icon-image-wrapper icon-conciertos">
            <img src="/icons/conciertos.png" alt="Conciertos" />
          </div>
          <span>La gira de Nadie</span>
        </div>

        <div
          className={`desktop-icon ${selectedIcon === "merchan" ? "selected" : ""}`}
          onClick={() => handleIconClick("merchan")}
        >
          <div className="desktop-icon-image-wrapper icon-merchan">
            <img src="/icons/merchan.png" alt="Merchan" />
          </div>
          <span>Tienda</span>
        </div>

        <div
          className={`desktop-icon ${selectedIcon === "musica" ? "selected" : ""}`}
          onClick={() => handleIconClick("musica")}
          onMouseEnter={prefetchSpotify}
        >
          <div className="desktop-icon-image-wrapper">
            <img src="/icons/musica.png" alt="Música" />
          </div>
          <span>Música</span>
        </div>

        <div
          className={`desktop-icon ${selectedIcon === "videos" ? "selected" : ""}`}
          onClick={() => handleIconClick("videos")}
        >
          <div className="desktop-icon-image-wrapper">
            <img src="/icons/videos.png" alt="Videos" />
          </div>
          <span>Videos</span>
        </div>

        <div
          className={`desktop-icon hidden ${selectedIcon === "bio" ? "selected" : ""}`}
          onClick={() => handleIconClick("bio")}
        >
          <div className="desktop-icon-image-wrapper">
            <img src="/icons/bio.png" alt="Bio" />
          </div>
          <span>Bio</span>
        </div>
      </div>

      {windows
        .filter((w) => !w.isMinimized)
        .map((windowItem) => (
          <div
            key={windowItem.id}
            className={`window ${!isDesktop ? (windowItem.isInitial ? `mobile-window-initial mobile-window-${windowItem.id}` : 'mobile-window') : ''}`}
            style={isDesktop ? {
              left: windowItem.x,
              top: windowItem.y,
              width: windowItem.width,
              height: windowItem.height,
              zIndex: windowItem.zIndex,
              pointerEvents: "auto",
            } : {
              zIndex: windowItem.zIndex,
              pointerEvents: "auto",
            }}
            onClick={() => focusWindow(windowItem.id)}
          >
            <div
              className="window-header flex items-center justify-between"
              onMouseDown={(e) => startDrag(e, windowItem.id)}
            >
              <span className="window-title flex-1 truncate pr-2">{windowItem.title}</span>
              <div className="window-controls flex-shrink-0">
                <button className="window-control minimize" onClick={() => minimizeWindow(windowItem.id)}>
                  −
                </button>
                <button className="window-control close" onClick={() => closeWindow(windowItem.id)}>
                  ×
                </button>
              </div>
            </div>
            <div className={windowItem.id === "musica" ? "window-content-musica" : "window-content"}>{windowItem.content}</div>
          </div>
        ))}

      {isStartMenuOpen && (
        <div className="start-menu">
          <div className="start-menu-layout">
            {/* Blue sidebar on the left */}
            <div className="start-menu-sidebar bg-blue-500 p-4">
              <div className="start-menu-user">
                <div className="start-menu-avatar"></div>
                <span className="text-white">Usuario</span>
              </div>
            </div>

            {/* White content area on the right */}
            <div className="start-menu-items bg-white p-4">
              <div
                className="start-menu-item flex items-center space-x-2 mb-2 cursor-pointer"
                onClick={() => {
                  openWindow("musica", "Música", <MusicaContent />)
                  setIsStartMenuOpen(false)
                }}
              >
                <img src="/icons/musica.png" alt="Música" width={32} height={32} />
                <span>Música</span>
              </div>

              <div
                className="start-menu-item flex items-center space-x-2 mb-2 cursor-pointer"
                onClick={() => {
                  openWindow("bio", "Bio", <BioContent />)
                  setIsStartMenuOpen(false)
                }}
              >
                <img src="/icons/bio.png" alt="Bio" width={32} height={32} />
                <span>Bio</span>
              </div>

              <div
                className="start-menu-item flex items-center space-x-2 mb-2 cursor-pointer"
                onClick={() => {
                  router.push("/conciertos")
                }}
                onMouseEnter={prefetchConciertos}
              >
                <img src="/icons/conciertos.png" alt="Conciertos" width={32} height={32} />
                <span>La gira de Nadie</span>
              </div>

              <div
                className="start-menu-item flex items-center space-x-2 mb-2 cursor-pointer"
                onClick={() => {
                  window.open("https://merchandtour.com/besmaya/", "_blank")
                  setIsStartMenuOpen(false)
                }}
              >
                <img src="/icons/merchan.png" alt="Merchan" width={32} height={32} />
                <span>Merchan</span>
              </div>

              <div
                className="start-menu-item flex items-center space-x-2 mb-2 cursor-pointer"
                onClick={() => {
                  window.open("https://www.youtube.com/@BESMAYA", "_blank")
                  setIsStartMenuOpen(false)
                }}
              >
                <img src="/icons/videos.png" alt="Videos" width={32} height={32} />
                <span>Videos</span>
              </div>

              <div className="border-t border-gray-300 my-2"></div>
              <div
                className="start-menu-item flex items-center space-x-2 mb-2 cursor-pointer"
                onClick={() => {
                  openWindow("paint", "Paint", <PaintContent />)
                  setIsStartMenuOpen(false)
                }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🎨</span>
                </div>
                <span>Paint</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Spotify prefetch iframe */}
      {spotifyPrefetched && (
        <iframe
          src="https://open.spotify.com/embed/playlist/0iXYV9B7pvlsZKqJEfOk5V?utm_source=generator&theme=0"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
            visibility: 'hidden'
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      <div className="xp-taskbar flex items-center justify-between px-2 sm:px-4 py-2 bg-gray-800 text-white">
        <button className="xp-start-btn" onClick={toggleStartMenu}>
          <img src="/icons/sistema-operativo.png" alt="Start" width={16} height={16} className="mr-1 sm:mr-1" />
          <span className="hidden sm:inline">start</span>
        </button>

        {/* Indicadores de ventanas en móvil */}
        {!isDesktop && windows.length > 0 && (
          <div className="flex gap-1 mx-2">
            {windows.map((w) => (
              <button
                key={w.id}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  !w.isMinimized ? 'bg-blue-400/80' : 'bg-blue-600/60'
                }`}
                onClick={() => {
                  if (w.isMinimized) {
                    setWindows(prev => prev.map(win =>
                      win.id === w.id ? {...win, isMinimized: false, zIndex: nextZIndex} : win
                    ))
                    setNextZIndex(prev => prev + 1)
                  } else {
                    minimizeWindow(w.id)
                  }
                }}
                title={w.title}
              >
                <span className="text-xs">📄</span>
              </button>
            ))}
          </div>
        )}

        {/* Botones de ventanas - solo desktop */}
        {isDesktop && (
        <div className="xp-taskbar-buttons flex-1 flex overflow-hidden">
          {windows.map((windowItem) => (
            <button
              key={windowItem.id}
              className={`xp-taskbar-btn ${!windowItem.isMinimized ? "active" : ""} px-2 py-1 text-xs max-w-[120px] truncate`}
              onClick={() => {
                if (windowItem.isMinimized) {
                  setWindows((prev) =>
                    prev.map((w) => (w.id === windowItem.id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w)),
                  )
                  setNextZIndex((prev) => prev + 1)
                } else {
                  minimizeWindow(windowItem.id)
                }
              }}
            >
              {windowItem.title}
            </button>
          ))}
        </div>
        )}

        <div className="flex items-center space-x-2 sm:space-x-1 text-white text-xs flex-shrink-0">
          <a
            href="https://www.instagram.com/somosbesmaya/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-blue-200 cursor-pointer font-bold p-2 sm:p-0"
          >
            IG
          </a>
          <a
            href="https://www.tiktok.com/@somosbesmaya"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-blue-200 cursor-pointer font-bold p-2 sm:p-0"
          >
            TT
          </a>
          <span className="text-white hidden sm:inline">|</span>
          <div className="xp-clock text-white">{time}</div>
        </div>
      </div>
    </div>
  )
}

function UnderConstructionPage({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fillRule=evenodd%3E%3Cg fill=%23ffffff fillOpacity=0.1%3E%3Ccircle cx=30 cy=30 r=2/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      <div className="text-center z-10 max-w-2xl mx-auto px-6">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-wider">BESMAYA</h1>
          <div className="w-32 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto"></div>
        </div>

        {/* Main message */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-4xl text-gray-300 mb-6 font-light">Sitio en Construcción</h2>
          <p className="text-lg text-gray-400 leading-relaxed max-w-lg mx-auto">
            Estamos trabajando en algo increíble. Muy pronto podrás disfrutar de una experiencia única.
          </p>
        </div>

        {/* Social links */}
        <div className="mb-12">
          <div className="flex justify-center space-x-6">
            <a
              href="https://merchandtour.com/besmaya/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
            >
              Merchan
            </a>
            <a
              href="/conciertos"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
            >
              Entradas
            </a>
          </div>
        </div>

        {/* Coming soon indicator */}
        <div className="text-gray-500 text-sm">
          <p>Próximamente...</p>
        </div>
      </div>

      {/* Hidden toggle for admin access */}
      <button
        onClick={onToggle}
        className="absolute bottom-4 right-4 opacity-0 hover:opacity-50 text-white text-xs px-2 py-1 bg-black bg-opacity-50 rounded"
        title="Press Ctrl+Shift+C to toggle"
      >
        Admin
      </button>
    </div>
  )
}

function MusicaContent() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="relative w-full h-full">
      {/* Skeleton loader */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#121212] flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#1DB954]/30 mb-3 animate-pulse" />
          <div className="w-24 h-3 bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="w-16 h-2 bg-gray-800 rounded animate-pulse" />
        </div>
      )}
      <iframe
        src="https://open.spotify.com/embed/playlist/0iXYV9B7pvlsZKqJEfOk5V?utm_source=generator&theme=0"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        className={`block w-full h-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  )
}

function BioContent() {
  return (
    <div className="h-full">
      <div className="bg-white border border-gray-300 h-full p-4 overflow-auto" style={{ fontFamily: "monospace" }}>
        <div className="text-sm leading-relaxed">
          <p className="mb-4">Besmaya son Javi Ojanguren y Javi Echavarri</p>
        </div>
      </div>
    </div>
  )
}

function ConcertosContent() {
  const concerts = [
    { date: "15 Mar 2024", city: "Madrid", venue: "Sala Riviera", link: "#" },
    { date: "22 Mar 2024", city: "Barcelona", venue: "Razzmatazz", link: "#" },
    { date: "29 Mar 2024", city: "Valencia", venue: "Loco Club", link: "#" },
    { date: "05 Abr 2024", city: "Sevilla", venue: "Sala X", link: "#" },
    { date: "12 Abr 2024", city: "Bilbao", venue: "Kafe Antzokia", link: "#" },
  ]

  return (
    <div className="h-full">
      <div className="bg-white border border-gray-300 h-full p-2">
        <div className="space-y-1">
          {concerts.map((concert, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 hover:bg-blue-100 border-b border-gray-200"
            >
              <div className="flex-1">
                <span className="font-bold">{concert.date}</span>
                <span className="mx-2">—</span>
                <span>{concert.city}</span>
                <span className="mx-2">—</span>
                <span>{concert.venue}</span>
              </div>
              <a href={concert.link} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                Ver
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MerchanContent() {
  const merchItems = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Producto ${i + 1}`,
    image: `/placeholder.svg?height=120&width=120&query=band merchandise item ${i + 1}`,
  }))

  return (
    <div className="h-full">
      <div className="bg-white border border-gray-300 h-full p-4 overflow-auto">
        <div className="grid grid-cols-3 gap-4">
          {merchItems.map((item) => (
            <div
              key={item.id}
              className="border border-gray-300 p-2 hover:bg-blue-50 cursor-pointer"
              onClick={() => {
                alert(`Vista previa de ${item.name}`)
              }}
            >
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                className="w-full h-24 object-cover mb-2 placeholder-img"
              />
              <div className="text-xs text-center">{item.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PaintContent() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 640)
  }, [])

  if (isMobile) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-100">
        <div className="text-6xl mb-4">🎨</div>
        <h2 className="text-xl font-bold mb-2">Paint</h2>
        <p className="text-gray-600">
          Esta aplicación funciona mejor en un ordenador.
        </p>
        <p className="text-gray-500 text-sm mt-4">
          ¡Visita desde tu PC para dibujar!
        </p>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-200 flex flex-col">
      <div className="bg-gray-100 border-b border-gray-300 p-1 flex space-x-2">
        <button className="px-2 py-1 text-xs hover:bg-blue-100">File</button>
        <button className="px-2 py-1 text-xs hover:bg-blue-100">Edit</button>
        <button className="px-2 py-1 text-xs hover:bg-blue-100">View</button>
        <button className="px-2 py-1 text-xs hover:bg-blue-100">Image</button>
        <button className="px-2 py-1 text-xs hover:bg-blue-100">Colors</button>
        <button className="px-2 py-1 text-xs hover:bg-blue-100">Help</button>
      </div>

      <div className="bg-gray-100 border-b border-gray-300 p-1 flex space-x-1">
        <button className="w-8 h-8 bg-white border border-gray-400 hover:bg-gray-50 flex items-center justify-center text-xs">
          ✏️
        </button>
        <button className="w-8 h-8 bg-white border border-gray-400 hover:bg-gray-50 flex items-center justify-center text-xs">
          🖌️
        </button>
        <button className="w-8 h-8 bg-white border border-gray-400 hover:bg-gray-50 flex items-center justify-center text-xs">
          🪣
        </button>
        <button className="w-8 h-8 bg-white border border-gray-400 hover:bg-gray-50 flex items-center justify-center text-xs">
          ⬜
        </button>
        <button className="w-8 h-8 bg-white border border-gray-400 hover:bg-gray-50 flex items-center justify-center text-xs">
          ⭕
        </button>
      </div>

      <div className="flex-1 bg-white m-2 border-2 border-gray-400 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Canvas de dibujo</div>
      </div>

      <div className="bg-gray-100 border-t border-gray-300 p-1 flex space-x-2">
        <div className="flex space-x-1">
          {["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"].map((color) => (
            <div
              key={color}
              className="w-6 h-6 border border-gray-400 cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function WelcomePosterContent() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="flex flex-col items-center p-0 sm:p-2">
      <div className="relative w-full mb-1 sm:mb-4">
        {!isLoaded && (
          <div className="w-full aspect-[3/4] bg-gray-300 animate-pulse rounded-lg" />
        )}
        <img
          src="FEED.png"
          alt="Besmaya Madrid Concert"
          className={`w-full h-auto rounded-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute top-0 left-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      <Link
        href="/conciertos"
        prefetch={true}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-center block transition-colors duration-200"
      >
        entradas
      </Link>
    </div>
  )
}

function AlbumContent() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="flex flex-col items-center p-0 sm:p-2">
      <div className="relative w-full mb-1 sm:mb-4">
        {!isLoaded && (
          <div className="w-full aspect-square bg-gray-300 animate-pulse rounded-lg" />
        )}
        <img
          src="/album-lavida.png"
          alt="La vida de Nadie - Besmaya"
          className={`w-full h-auto rounded-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute top-0 left-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      <a
        href="https://acqustic-platform.sumupstore.com/producto/la-vida-de-nadie-besmaya"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded-lg text-center block transition-colors duration-200"
      >
        comprar ahora
      </a>
    </div>
  )
}
