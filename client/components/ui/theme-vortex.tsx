"use client"

import { useTheme } from "next-themes"
import { Vortex } from "./vortex"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useEffect, useState } from "react"

interface ThemeVortexProps {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  particleCount?: number
  rangeY?: number
  baseHue?: number
  baseSpeed?: number
  rangeSpeed?: number
  baseRadius?: number
  rangeRadius?: number
  backgroundColor?: string
}

export function ThemeVortex({
  children,
  className,
  containerClassName,
  particleCount = 700,
  rangeY = 100,
  baseSpeed = 0.0,
  rangeSpeed = 1.5,
  baseRadius = 1,
  rangeRadius = 2,
}: ThemeVortexProps) {
  const { theme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (prefersReducedMotion || !mounted) {
    return (
      <div className={`${className || ""} ${containerClassName || ""}`}>
        {children}
      </div>
    )
  }

  const getThemeConfig = () => {
    if (theme === "dark") {
      return {
        baseHue: 220, // blue in dark
        backgroundColor: "transparent",
        opacity: "opacity-30", // a bit subtler
      }
    } else {
      return {
        baseHue: 328, // pink in light
        backgroundColor: "transparent",
        opacity: "opacity-25",
      }
    }
  }

  const config = getThemeConfig()

  return (
    <Vortex
      className={`${config.opacity} ${className || ""}`}
      containerClassName={containerClassName}
      particleCount={particleCount}
      rangeY={rangeY}
      baseHue={config.baseHue}
      baseSpeed={baseSpeed}
      rangeSpeed={rangeSpeed}
      baseRadius={baseRadius}
      rangeRadius={rangeRadius}
      backgroundColor={config.backgroundColor}
    >
      {children}
    </Vortex>
  )
}
