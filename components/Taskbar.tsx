"use client"

import type React from "react"

interface TaskbarProps {
  time: string
  onStartClick: () => void
  startDisabled?: boolean
  children?: React.ReactNode
  showSocialLinks?: boolean
}

export function Taskbar({ time, onStartClick, startDisabled, children, showSocialLinks }: TaskbarProps) {
  return (
    <div className="xp-taskbar flex items-center justify-between px-2 sm:px-4 py-2 bg-gray-800 text-white">
      <div className="flex items-center">
        <button className="xp-start-btn" onClick={onStartClick} disabled={startDisabled}>
          <img src="/icons/sistema-operativo.png" alt="Start" width={16} height={16} className="mr-1 sm:mr-1" />
          <span className="hidden sm:inline">start</span>
        </button>
        {children}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-1 text-white text-xs flex-shrink-0">
        {showSocialLinks && (
          <>
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
          </>
        )}
        <div className="xp-clock text-white">{time}</div>
      </div>
    </div>
  )
}
