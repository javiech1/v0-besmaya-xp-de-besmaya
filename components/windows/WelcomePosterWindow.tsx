"use client"

import { useState } from "react"
import Link from "next/link"

export function WelcomePosterContent() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="flex flex-col items-center p-0 sm:p-2">
      <div className="relative w-full mb-1 sm:mb-4">
        {!isLoaded && (
          <div className="w-full aspect-[3/4] bg-gray-300 animate-pulse rounded-none sm:rounded-lg" />
        )}
        <img
          src="/gira.jpg"
          alt="La gira de Nadie - Besmaya"
          className={`w-full h-auto rounded-none sm:rounded-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute top-0 left-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      <Link
        href="/conciertos"
        prefetch={true}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-center block transition-colors duration-200 text-sm sm:text-base border-transparent"
      >
        entradas
      </Link>
    </div>
  )
}
