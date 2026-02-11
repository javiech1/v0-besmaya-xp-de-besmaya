"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useClock } from "@/hooks/useClock"
import { Taskbar } from "@/components/Taskbar"
import { MusicaContent } from "@/components/windows/MusicaWindow"
import { BioContent } from "@/components/windows/BioWindow"
import { WelcomePosterContent } from "@/components/windows/WelcomePosterWindow"
import { AlbumContent } from "@/components/windows/AlbumWindow"
import { MuroContent } from "@/components/windows/MuroWindow"
import { UnderConstructionPage } from "@/components/windows/UnderConstructionPage"
import { Y2KNotificationBanner } from "@/components/Y2KNotificationBanner"

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

// Altura del taskbar XP
const TASKBAR_HEIGHT = 40

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
  const time = useClock()
  const [nextZIndex, setNextZIndex] = useState(100)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)
  const [isUnderConstruction, setIsUnderConstruction] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isDesktopDetermined, setIsDesktopDetermined] = useState(false)
  const [isSmallDesktop, setIsSmallDesktop] = useState(false)
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false)
  const [hasFinePointer, setHasFinePointer] = useState(false)
  const [initialWindowsCreated, setInitialWindowsCreated] = useState(false)
  const router = useRouter()
  const iconsContainerRef = useRef<HTMLDivElement>(null)
  const forcedMobileByCollision = useRef(false)
  const collisionEntryHeight = useRef<number>(0)

  useEffect(() => {
    // Detectar capacidad de puntero fino (ratón)
    const pointerQuery = window.matchMedia('(pointer: fine)')
    const updatePointer = () => setHasFinePointer(pointerQuery.matches)
    updatePointer()
    pointerQuery.addEventListener('change', updatePointer)

    const checkScreenSize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const isLandscape = w > h
      const hasPointer = pointerQuery.matches

      // Ancho mínimo para que quepan todos los iconos en desktop
      // 6 iconos × 140px + margen = ~880px
      const MIN_DESKTOP_WIDTH = 880

      // Desktop SOLO si tiene puntero fino (ratón) Y caben los iconos
      // Sin puntero fino = siempre móvil, sin importar tamaño de pantalla
      let isDesktopMode = hasPointer && w >= MIN_DESKTOP_WIDTH

      // Si es desktop, verificar si los iconos tocan la taskbar
      if (isDesktopMode && iconsContainerRef.current) {
        const iconsRect = iconsContainerRef.current.getBoundingClientRect()
        const taskbarTop = h - TASKBAR_HEIGHT
        const iconHeight = 130
        const enterThreshold = iconHeight * 0.2

        if (forcedMobileByCollision.current) {
          // Ya en móvil por colisión: solo salir si hay suficiente altura extra
          if (h > collisionEntryHeight.current + 100) {
            forcedMobileByCollision.current = false
            collisionEntryHeight.current = 0
          } else {
            isDesktopMode = false
          }
        } else {
          // Verificar si debemos entrar a móvil por colisión
          if (iconsRect.bottom > taskbarTop + enterThreshold) {
            forcedMobileByCollision.current = true
            collisionEntryHeight.current = h
            isDesktopMode = false
          }
        }
      }

      // Forzar landscape cuando móvil por colisión vertical (pantalla desktop sin altura)
      const shouldBeLandscapeMobile = forcedMobileByCollision.current
        ? true
        : (!isDesktopMode && isLandscape)

      setIsDesktop(isDesktopMode)
      setIsSmallDesktop(isDesktopMode && w < 1024)
      setIsLandscapeMobile(shouldBeLandscapeMobile)
      setIsDesktopDetermined(true)
    }
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    window.addEventListener("orientationchange", checkScreenSize)
    return () => {
      window.removeEventListener("resize", checkScreenSize)
      window.removeEventListener("orientationchange", checkScreenSize)
      pointerQuery.removeEventListener('change', updatePointer)
    }
  }, [])

  // Clamping de ventanas cuando el viewport se reduce (solo en desktop)
  useEffect(() => {
    if (!isDesktop) return

    const handleViewportResize = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight

      setWindows(prev => prev.map(w => {
        const windowHeight = typeof w.height === "number" ? w.height : 400
        const maxX = Math.max(0, vw - w.width)
        const maxY = Math.max(0, vh - windowHeight - TASKBAR_HEIGHT)

        return {
          ...w,
          x: Math.max(0, Math.min(w.x, maxX)),
          y: Math.max(0, Math.min(w.y, maxY)),
        }
      }))
    }

    window.addEventListener("resize", handleViewportResize)
    return () => window.removeEventListener("resize", handleViewportResize)
  }, [isDesktop])

  // Adaptar ventanas iniciales cuando cambia el modo desktop↔móvil
  useEffect(() => {
    if (!isDesktopDetermined || !initialWindowsCreated) return

    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    setWindows(prev => prev.map(w => {
      if (!w.isInitial) return w

      if (!isDesktop) {
        // Modo móvil: ancho completo
        return { ...w, x: 0, y: 0, width: screenWidth }
      } else {
        // Modo desktop: recalcular posiciones
        const isSmall = screenWidth < 1024
        const scale = isSmall ? Math.max(0.75, screenWidth / 1024) : 1
        const windowWidth = Math.min(384, screenWidth * 0.4) * scale
        const offsetX = isSmall ? Math.min(100, screenWidth * 0.1) : 200

        if (w.id === "welcome-poster") {
          return {
            ...w,
            x: Math.max(20, screenWidth / 2 - windowWidth / 2 - offsetX),
            y: Math.max(20, screenHeight / 2 - 275 - 80),
            width: windowWidth,
          }
        } else if (w.id === "album") {
          return {
            ...w,
            x: Math.min(screenWidth - windowWidth - 20, screenWidth / 2 - windowWidth / 2 + offsetX),
            y: Math.max(20, screenHeight / 2 - 230 + (isSmall ? 60 : 120)),
            width: windowWidth,
          }
        }
        return w
      }
    }))
  }, [isDesktop, isDesktopDetermined, initialWindowsCreated])

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
                y: Math.max(0, Math.min(window.innerHeight - (typeof windowItem.height === "number" ? windowItem.height : 600) - TASKBAR_HEIGHT, dragState.startWindowY + deltaY)),
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

    // Check if windows were already created in this session
    if (typeof window !== "undefined" && sessionStorage.getItem("initialWindowsCreated") === "true") {
      setInitialWindowsCreated(true)
      return
    }

    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1024
    const screenHeight = typeof window !== "undefined" ? window.innerHeight : 768

    // En móvil: mostrar las 2 ventanas apiladas debajo de los iconos
    if (!isDesktop) {
      const initialWindows: WindowState[] = [
        {
          id: "welcome-poster",
          title: "La gira de Nadie",
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
      sessionStorage.setItem("initialWindowsCreated", "true")
      return
    }

    // Desktop: tres ventanas distribuidas sin solapamiento
    const isSmall = screenWidth < 1024
    const scale = isSmall ? Math.max(0.75, screenWidth / 1024) : 1

    const feedWidth = Math.min(384, screenWidth * 0.4) * scale
    const albumWidth = Math.min(384, screenWidth * 0.4) * scale
    const muroWidth = Math.min(400, screenWidth * 0.45) * scale
    const feedEstimatedHeight = 550
    const albumEstimatedHeight = 460
    const muroEstimatedHeight = 500

    const gap = 20
    const totalWidth = feedWidth + albumWidth + muroWidth + gap * 2
    const fits = totalWidth + gap * 2 <= screenWidth

    let welcomeX: number, albumX: number, muroX: number

    if (fits) {
      // Distribuir en 3 columnas sin solapamiento
      const startX = Math.max(gap, (screenWidth - totalWidth) / 2)
      welcomeX = startX
      albumX = startX + feedWidth + gap
      muroX = startX + feedWidth + gap + albumWidth + gap
    } else {
      // Cascada para pantallas pequeñas
      const offsetX = isSmall ? Math.min(100, screenWidth * 0.1) : 200
      welcomeX = Math.max(20, screenWidth / 2 - feedWidth / 2 - offsetX)
      albumX = Math.min(screenWidth - albumWidth - 20, screenWidth / 2 - albumWidth / 2 + offsetX)
      muroX = Math.max(20, screenWidth / 2 - muroWidth / 2)
    }

    const centerY = (screenHeight - TASKBAR_HEIGHT) / 2

    const initialWindows: WindowState[] = [
      {
        id: "welcome-poster",
        title: "La gira de Nadie",
        content: <WelcomePosterContent />,
        x: welcomeX,
        y: Math.max(20, Math.min(centerY - feedEstimatedHeight / 2, screenHeight - feedEstimatedHeight - TASKBAR_HEIGHT - 20)),
        width: feedWidth,
        height: "auto",
        isMinimized: false,
        zIndex: 101,
      },
      {
        id: "album",
        title: "La vida de Nadie",
        content: <AlbumContent />,
        x: albumX,
        y: Math.max(20, Math.min(centerY - albumEstimatedHeight / 2, screenHeight - albumEstimatedHeight - TASKBAR_HEIGHT - 20)),
        width: albumWidth,
        height: "auto",
        isMinimized: false,
        zIndex: 102,
      },
      {
        id: "muro",
        title: "El Muro de Nadie",
        content: <MuroContent />,
        x: muroX,
        y: Math.max(20, Math.min(centerY - muroEstimatedHeight / 2, screenHeight - muroEstimatedHeight - TASKBAR_HEIGHT - 20)),
        width: muroWidth,
        height: muroEstimatedHeight,
        isMinimized: false,
        zIndex: 103,
      },
    ]

    setWindows(initialWindows)
    setNextZIndex(104)
    setInitialWindowsCreated(true)
    sessionStorage.setItem("initialWindowsCreated", "true")
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

    const vw = window.innerWidth
    const vh = window.innerHeight

    // Factor de escala para escritorios pequeños (640-1024px)
    const scale = vw < 1024 ? Math.max(0.75, vw / 1024) : 1

    // Dimensiones base responsivas
    let windowWidth: number
    let windowHeight: number

    if (id === "musica") {
      windowWidth = Math.min(306, vw * 0.4) * scale
      windowHeight = Math.min(388, vh * 0.6)
    } else if (id === "welcome") {
      windowWidth = Math.min(420, vw * 0.45) * scale
      windowHeight = Math.min(520, vh * 0.7)
    } else if (id === "welcome-mobile") {
      windowWidth = Math.min(350, vw * 0.4) * scale
      windowHeight = Math.min(600, vh * 0.75)
    } else if (id === "muro") {
      windowWidth = Math.min(400, vw * 0.45) * scale
      windowHeight = Math.min(500, vh * 0.65)
    } else {
      windowWidth = Math.min(600, vw * 0.6) * scale
      windowHeight = Math.min(400, vh * 0.55)
    }

    // Tamaño mínimo usable
    windowWidth = Math.max(280, windowWidth)
    windowHeight = Math.max(200, windowHeight)

    // Posición con cascade offset adaptativo
    const cascadeOffset = (windows.length % 5) * (isSmallDesktop ? 20 : 30)
    const x = Math.max(0, Math.min(
      50 + cascadeOffset,
      vw - windowWidth
    ))
    const y = Math.max(0, Math.min(
      50 + cascadeOffset,
      vh - windowHeight - TASKBAR_HEIGHT
    ))

    const newWindow: WindowState = {
      id,
      title,
      content,
      x,
      y,
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
      case "vinilo":
        window.open("https://acqustic-platform.sumupstore.com/producto/la-vida-de-nadie-besmaya", "_blank")
        break
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
      case "muro":
        openWindow("muro", "El Muro de Nadie", <MuroContent />)
        break
      case "conciertos":
        router.push("/conciertos")
        break
      case "videos":
        window.open("https://www.youtube.com/@BESMAYA", "_blank")
        break
    }
    setSelectedIcon(null)
  }

  const toggleStartMenu = () => {
    setIsStartMenuOpen(!isStartMenuOpen)
  }


  // Sync --app-height and --app-offset-top with visualViewport for mobile keyboard handling.
  // On iOS Safari, when the keyboard opens the browser scrolls the layout viewport down
  // but position:fixed elements stay at the top of the layout viewport (off-screen).
  // We use visualViewport.offsetTop to reposition them into the visible area.
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      if (vv) {
        document.documentElement.style.setProperty('--app-height', `${vv.height}px`)
        document.documentElement.style.setProperty('--app-offset-top', `${vv.offsetTop}px`)
      } else {
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
        document.documentElement.style.setProperty('--app-offset-top', '0px')
      }
    }
    update()
    // Listen for both resize (keyboard open/close) and scroll (viewport shift)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Prevent body scroll on iOS: block touchmove unless inside a scrollable element
  useEffect(() => {
    let startY = 0
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY
      let el = e.target as HTMLElement | null
      while (el && el !== document.documentElement) {
        const { overflowY } = window.getComputedStyle(el)
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          const { scrollTop, scrollHeight, clientHeight } = el
          if (dy > 0 && scrollTop > 0) return
          if (dy < 0 && scrollTop + clientHeight < scrollHeight) return
          break
        }
        el = el.parentElement
      }
      e.preventDefault()
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
    }
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

  if (isUnderConstruction) {
    return <UnderConstructionPage onToggle={() => setIsUnderConstruction(false)} />
  }

  return (
    <div className={`h-screen w-screen relative overflow-hidden ${isLandscapeMobile ? 'landscape-mobile' : ''}`}>
      <img
        src="/xp-bliss-custom.jpg"
        alt="Windows XP Bliss Wallpaper"
        className="absolute inset-0 w-full h-full object-cover -z-10"
      />

      <div
        ref={iconsContainerRef}
        className={`desktop-icons ${
        isLandscapeMobile
          ? ''
          : isDesktop
            ? 'absolute top-8 left-8 flex flex-wrap gap-5'
            : 'absolute top-8 left-8 grid grid-cols-2 gap-5'
      }`}>
        <div
          className={`desktop-icon ${selectedIcon === "conciertos" ? "selected" : ""}`}
          onClick={() => handleIconClick("conciertos")}
        >
          <div className="desktop-icon-image-wrapper icon-conciertos">
            <img src="/icons/conciertos.png" alt="Conciertos" />
          </div>
          <span>La gira de Nadie</span>
        </div>

        <div
          className={`desktop-icon ${selectedIcon === "vinilo" ? "selected" : ""}`}
          onClick={() => handleIconClick("vinilo")}
        >
          <div className="desktop-icon-image-wrapper icon-vinilo">
            <img src="/icons/vinilo.png" alt="Vinilos y CDs" />
          </div>
          <span>Vinilos y CDs</span>
        </div>

        <div
          className={`desktop-icon ${selectedIcon === "merchan" ? "selected" : ""}`}
          onClick={() => handleIconClick("merchan")}
        >
          <div className="desktop-icon-image-wrapper icon-merchan">
            <img src="/icons/merchan.png" alt="Merchan" />
          </div>
          <span>Merch</span>
        </div>

        <div
          className={`desktop-icon ${selectedIcon === "muro" ? "selected" : ""}`}
          onClick={() => handleIconClick("muro")}
        >
          <div className="desktop-icon-image-wrapper">
            <img src="/icons/muro.svg" alt="El Muro de Nadie" />
          </div>
          <span>El Muro de Nadie</span>
        </div>

        <div
          className={`desktop-icon ${selectedIcon === "musica" ? "selected" : ""}`}
          onClick={() => handleIconClick("musica")}
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
          className={`desktop-icon ${selectedIcon === "bio" ? "selected" : ""}`}
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
                  openWindow("muro", "El Muro de Nadie", <MuroContent />)
                  setIsStartMenuOpen(false)
                }}
              >
                <img src="/icons/muro.svg" alt="El Muro" width={32} height={32} />
                <span>El Muro de Nadie</span>
              </div>

              <div
                className="start-menu-item flex items-center space-x-2 mb-2 cursor-pointer"
                onClick={() => {
                  router.push("/conciertos")
                }}
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

            </div>
          </div>
        </div>
      )}

      <Y2KNotificationBanner onOpenMuro={() => openWindow("muro", "El Muro de Nadie", <MuroContent />)} />

      <Taskbar time={time} onStartClick={toggleStartMenu} showSocialLinks>
          {/* Indicadores de ventanas en móvil */}
          {!isDesktop && windows.length > 0 && (
            <div className="flex gap-1 ml-2">
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
                  <span className="text-xs">{w.id === 'welcome-poster' ? '🎫' : w.id === 'album' ? '💿' : w.id === 'muro' ? '🧱' : '📄'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Botones de ventanas - solo desktop */}
          {isDesktop && (
          <div className="xp-taskbar-buttons flex-1 flex overflow-hidden ml-2">
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
      </Taskbar>
    </div>
  )
}

