"use client"

import { useEffect, useState } from "react"

export function useResponsiveParticles() {
  const [particleCount, setParticleCount] = useState(200)

  useEffect(() => {
    const updateParticleCount = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Base particle count on screen size and device capabilities
      if (width < 768) {
        // Mobile devices - lower particle count for better performance
        setParticleCount(80)
      } else if (width < 1024) {
        // Tablet devices
        setParticleCount(150)
      } else {
        // Desktop devices
        setParticleCount(200)
      }
    }

    updateParticleCount()
    window.addEventListener("resize", updateParticleCount)
    
    return () => window.removeEventListener("resize", updateParticleCount)
  }, [])

  return particleCount
}
