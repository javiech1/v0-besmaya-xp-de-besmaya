"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function WinterTourContent() {
  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()

  return (
    <div className="flex flex-col items-center p-0 sm:p-2">
      <div className="relative w-full mb-1 sm:mb-4">
        {!isLoaded && (
          <div className="w-full aspect-[2174/2700] bg-gray-300 animate-pulse rounded-none sm:rounded-lg" />
        )}
        <img
          src="/cartel_invierno.jpeg"
          alt="La gira de invierno"
          className={`w-full h-auto rounded-none sm:rounded-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute top-0 left-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          router.push("/conciertos?tab=conciertos")
        }}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-center block transition-colors duration-200 text-sm sm:text-base border-transparent cursor-pointer"
      >
        entradas
      </button>
    </div>
  )
}
