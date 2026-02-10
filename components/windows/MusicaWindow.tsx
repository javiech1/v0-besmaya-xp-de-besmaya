"use client"

import { useState } from "react"

export function MusicaContent() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="relative w-full h-full">
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
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        className={`block w-full h-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  )
}
