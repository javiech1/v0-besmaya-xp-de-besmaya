"use client"

import { useState } from "react"

export function AlbumContent() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="flex flex-col items-center p-0 sm:p-2">
      <div className="relative w-full mb-1 sm:mb-4">
        {!isLoaded && (
          <div className="w-full aspect-square bg-gray-300 animate-pulse rounded-none sm:rounded-lg" />
        )}
        <img
          src="/album-lavida.png"
          alt="La vida de Nadie - Besmaya"
          className={`w-full h-auto rounded-none sm:rounded-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute top-0 left-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      <a
        href="https://acqustic-platform.sumupstore.com/producto/la-vida-de-nadie-besmaya"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-center block transition-colors duration-200 text-sm sm:text-base border-transparent"
      >
        comprar ahora
      </a>
    </div>
  )
}
