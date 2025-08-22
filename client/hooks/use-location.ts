import { useState, useEffect } from "react"
import { LocationService, LocationData } from "@/lib/location"

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for saved location on mount
    if (LocationService.hasSavedLocation()) {
      const savedLocation = LocationService.getSavedLocation()
      if (savedLocation) {
        setLocation(savedLocation)
      }
    }
  }, [])

  const requestLocation = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const locationData = await LocationService.requestLocation()
      setLocation(locationData)
      return locationData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const clearLocation = () => {
    setLocation(null)
    setError(null)
    // Optionally clear from localStorage
    localStorage.removeItem('user_location')
  }

  return {
    location,
    isLoading,
    error,
    requestLocation,
    clearLocation
  }
} 