"use client"
import { useState, useEffect } from "react"
import type React from "react"

import Link from "next/link"

interface Concert {
  id: string
  fecha: string
  ciudad: string
  sala: string
  link: string
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  const [concerts, setConcerts] = useState<Concert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newConcert, setNewConcert] = useState({
    fecha: "",
    ciudad: "",
    sala: "",
    link: "",
  })
  const [time, setTime] = useState("")
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)

  // Check existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth")
        const data = await response.json()
        setIsAuthenticated(data.authenticated)
      } catch {
        setIsAuthenticated(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsAuthenticated(true)
      } else {
        setLoginError(data.error || "Contraseña incorrecta")
      }
    } catch {
      setLoginError("Error de conexión")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" })
    } catch {
      // Ignore logout errors
    }
    setIsAuthenticated(false)
    setPassword("")
  }

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
    if (isAuthenticated) {
      fetchConcerts()
    }
  }, [isAuthenticated])

  const fetchConcerts = async () => {
    try {
      const response = await fetch("/api/admin/concerts")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setConcerts(data || [])
    } catch (error) {
      console.error("Error fetching concerts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addConcert = async () => {
    if (!newConcert.fecha || !newConcert.ciudad || !newConcert.sala || !newConcert.link) {
      alert("Please fill all fields")
      return
    }

    try {
      const response = await fetch("/api/admin/concerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConcert),
      })
      if (!response.ok) throw new Error("Failed to add")

      setNewConcert({ fecha: "", ciudad: "", sala: "", link: "" })
      fetchConcerts()
    } catch (error) {
      console.error("Error adding concert:", error)
      alert("Error adding concert")
    }
  }

  const updateConcert = async (id: string, updatedConcert: Partial<Concert>) => {
    try {
      const response = await fetch("/api/admin/concerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedConcert }),
      })
      if (!response.ok) throw new Error("Failed to update")

      setEditingId(null)
      fetchConcerts()
    } catch (error) {
      console.error("Error updating concert:", error)
      alert("Error updating concert")
    }
  }

  const deleteConcert = async (id: string) => {
    if (!confirm("Are you sure you want to delete this concert?")) return

    try {
      const response = await fetch("/api/admin/concerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error("Failed to delete")

      fetchConcerts()
    } catch (error) {
      console.error("Error deleting concert:", error)
      alert("Error deleting concert")
    }
  }

  const toggleStartMenu = () => {
    setIsStartMenuOpen(!isStartMenuOpen)
  }

  if (isCheckingAuth) {
    return <div className="h-screen w-screen flex items-center justify-center">Verificando sesión...</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen relative overflow-hidden">
        <img
          src="/xp-bliss-custom.jpg"
          alt="Windows XP Bliss Wallpaper"
          className="absolute inset-0 w-full h-full object-cover -z-10"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white border-2 border-gray-400 shadow-2xl rounded-lg p-8 w-96">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 rounded-t-lg -m-8 mb-6">
              <h1 className="text-xl font-bold">Admin Login</h1>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Contraseña:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Ingresa la contraseña"
                  autoFocus
                />
              </div>

              {loginError && <div className="text-red-500 text-sm">{loginError}</div>}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded"
              >
                Entrar
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/" className="text-blue-500 hover:underline text-sm">
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <img
        src="/xp-bliss-custom.jpg"
        alt="Windows XP Bliss Wallpaper"
        className="absolute inset-0 w-full h-full object-cover -z-10"
      />

      {/* Admin Panel */}
      <div className="absolute inset-0 pb-10 p-8">
        <div className="h-full bg-white border-2 border-gray-400 shadow-2xl overflow-auto">
          {/* Window title bar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 border-b border-blue-400 flex justify-between items-center">
            <h1 className="text-xl font-bold">Concert Admin Panel</h1>
            <button onClick={handleLogout} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm">
              Cerrar Sesión
            </button>
          </div>

          <div className="p-6">
            {/* Add new concert form */}
            <div className="bg-gray-50 border border-gray-300 rounded p-4 mb-6">
              <h2 className="text-lg font-bold mb-4">Add New Concert</h2>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Fecha (e.g., 30-ene)"
                  value={newConcert.fecha}
                  onChange={(e) => setNewConcert({ ...newConcert, fecha: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Ciudad"
                  value={newConcert.ciudad}
                  onChange={(e) => setNewConcert({ ...newConcert, ciudad: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Sala"
                  value={newConcert.sala}
                  onChange={(e) => setNewConcert({ ...newConcert, sala: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="url"
                  placeholder="Ticket Link"
                  value={newConcert.link}
                  onChange={(e) => setNewConcert({ ...newConcert, link: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <button
                onClick={addConcert}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded"
              >
                Add Concert
              </button>
            </div>

            {/* Concert list */}
            <div className="space-y-4">
              {concerts.map((concert) => (
                <div key={concert.id} className="bg-gray-50 border border-gray-300 rounded p-4">
                  {editingId === concert.id ? (
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <input
                        type="text"
                        defaultValue={concert.fecha}
                        onBlur={(e) => updateConcert(concert.id, { fecha: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        defaultValue={concert.ciudad}
                        onBlur={(e) => updateConcert(concert.id, { ciudad: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <input
                        type="text"
                        defaultValue={concert.sala}
                        onBlur={(e) => updateConcert(concert.id, { sala: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                      <input
                        type="url"
                        defaultValue={concert.link}
                        onBlur={(e) => updateConcert(concert.id, { link: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="text-lg font-mono font-bold text-gray-800 min-w-[80px]">{concert.fecha}</div>
                        <div className="text-xl font-bold text-black">{concert.ciudad}</div>
                        <div className="text-lg text-gray-600">{concert.sala}</div>
                        <div className="text-sm text-blue-600 truncate max-w-[200px]">{concert.link}</div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingId(concert.id)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteConcert(concert.id)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
                  <Link
                    href="/conciertos"
                    className="flex items-center space-x-2 p-2 hover:bg-blue-100 cursor-pointer rounded"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">🎵</span>
                    </div>
                    <span className="text-sm">Conciertos</span>
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
                  <div className="flex items-center space-x-2 p-2 hover:bg-blue-100 cursor-pointer rounded">
                    <div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center">
                      <span className="text-xs">📷</span>
                    </div>
                    <span className="text-sm">My Pictures</span>
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
        <button className="xp-start-btn" onClick={toggleStartMenu}>
          <img src="/icons/sistema-operativo.png" alt="Start" width={16} height={16} className="mr-1" />
          start
        </button>

        <div className="xp-taskbar-buttons">
          <button className="xp-taskbar-btn active">Concert Admin Panel</button>
        </div>

        <div className="xp-clock text-white">{time}</div>
      </div>
    </div>
  )
}
