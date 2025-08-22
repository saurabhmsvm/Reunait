"use client"

import { useState, useEffect, useCallback } from "react"
import { MapPin, Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LocationService, LocationData } from "@/lib/location"
import { Typography } from "@/components/ui/typography"

interface LocationPermissionProps {
  onLocationSet: (location: LocationData) => void
}

export function LocationPermission({ onLocationSet }: LocationPermissionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [hasRequested, setHasRequested] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleRequestLocation = useCallback(async () => {
    if (hasRequested) return // Prevent multiple requests
    
    setIsLoading(true)
    setError(null)
    setHasRequested(true)

    try {
      const locationData = await LocationService.requestLocation()
      setLocation(locationData)
      onLocationSet(locationData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location')
    } finally {
      setIsLoading(false)
    }
  }, [hasRequested, onLocationSet])

  useEffect(() => {
    if (!isMounted) return // Don't run on server-side
    
    // Check if location is already saved
    if (LocationService.hasSavedLocation()) {
      const savedLocation = LocationService.getSavedLocation()
      if (savedLocation) {
        setLocation(savedLocation)
        onLocationSet(savedLocation)
      }
    } else {
      // Auto-trigger location request for new users
      handleRequestLocation()
    }
  }, [onLocationSet, isMounted, handleRequestLocation])

  const handleSkipLocation = () => {
    // Set default location or skip
    const defaultLocation: LocationData = {
      country: 'Unknown',
      state: 'Unknown',
      city: 'Unknown',
      latitude: 0,
      longitude: 0
    }
    setLocation(defaultLocation)
    onLocationSet(defaultLocation)
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!isMounted) {
    return null
  }

  // If location is already set, show success state
  if (location) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Location Detected
          </CardTitle>
          <CardDescription>
            We&apos;ve detected your location to show relevant cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Typography variant="small" className="text-muted-foreground">
                {location.city}, {location.state}, {location.country}
              </Typography>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation(null)}
              className="w-full"
            >
              Change Location
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show loading or error state
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {isLoading ? "Detecting Location..." : "Location Access"}
        </CardTitle>
        <CardDescription>
          {isLoading 
            ? "Please allow location access to get relevant cases in your area"
            : "We need your location to provide better service and show relevant cases in your area."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
            <XCircle className="h-4 w-4 text-red-500" />
            <Typography variant="small" className="text-red-700 dark:text-red-300">
              {error}
            </Typography>
          </div>
        )}
        
        {error && (
          <div className="space-y-3">
            <Button 
              onClick={handleRequestLocation} 
              disabled={isLoading}
              className="w-full"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleSkipLocation}
              className="w-full"
            >
              Skip for now
            </Button>
          </div>
        )}
        
        <div className="text-center">
          <Typography variant="small" className="text-muted-foreground">
            Your location data is stored locally and used only to show relevant cases in your area.
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
} 