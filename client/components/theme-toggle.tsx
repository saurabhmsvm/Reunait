"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [isHovered, setIsHovered] = useState(false)

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const isLight = theme === "light"
  const nextTheme = isLight ? "dark" : "light"

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative overflow-hidden hover:scale-110 hover:shadow-lg transition-all duration-300 active:scale-95"
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {/* Current Theme Icon (Sun for light, Moon for dark) */}
      <Sun 
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          isLight && !isHovered 
            ? 'rotate-0 scale-100 text-yellow-600' 
            : 'rotate-90 scale-0 text-yellow-400'
        }`} 
      />
      <Moon 
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          !isLight && !isHovered 
            ? 'rotate-0 scale-100 text-blue-300' 
            : 'rotate-90 scale-0 text-blue-400'
        }`} 
      />

      {/* Opposite Icon (shown on hover) */}
      <Sun 
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          !isLight && isHovered 
            ? 'rotate-0 scale-100 text-yellow-600' 
            : 'rotate-90 scale-0 text-yellow-400'
        }`} 
      />
      <Moon 
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          isLight && isHovered 
            ? 'rotate-0 scale-100 text-blue-300' 
            : 'rotate-90 scale-0 text-blue-400'
        }`} 
      />
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 