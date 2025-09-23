/**
 * LocationContext - App-wide location state management
 * Provides location data and actions to all components
 */

'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useLocation, type UseLocationReturn } from '@/hooks/use-location'

interface LocationContextType extends UseLocationReturn {}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

interface LocationProviderProps {
  children: ReactNode
  autoRequest?: boolean
  enableCaching?: boolean
}

/**
 * LocationProvider - Provides location context to the app
 * Should be placed high in the component tree (e.g., in layout.tsx)
 */
export function LocationProvider({ 
  children, 
  autoRequest = true, 
  enableCaching = true 
}: LocationProviderProps) {
  const locationState = useLocation(autoRequest, enableCaching)

  return (
    <LocationContext.Provider value={locationState}>
      {children}
    </LocationContext.Provider>
  )
}

/**
 * useLocationContext - Hook to access location context
 * Must be used within a LocationProvider
 */
export function useLocationContext(): LocationContextType {
  const context = useContext(LocationContext)
  
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  
  return context
}

/**
 * useLocationFilters - Hook to get location-based filter defaults
 * Returns filters based on user's detected location
 */
export function useLocationFilters() {
  const { location, loading } = useLocationContext()
  
  const filters = React.useMemo(() => {
    if (location) {
      return {
        country: location.country,
        state: location.state !== 'Unknown' ? location.state : null,
        city: location.city !== 'Unknown' ? location.city : null
      }
    }
    
    // Fallback to India
    return {
      country: 'India',
      state: null,
      city: null
    }
  }, [location])

  return { filters, loading }
}

/**
 * LocationGuard - Component that handles location permission requests
 * Can be used to show permission prompts or location-based UI
 */
interface LocationGuardProps {
  children: ReactNode
  fallback?: ReactNode
  requirePermission?: boolean
}

export function LocationGuard({ 
  children, 
  fallback = null, 
  requirePermission = false 
}: LocationGuardProps) {
  const { hasPermission, isSupported, error } = useLocationContext()

  // If geolocation is not supported, show fallback
  if (!isSupported) {
    return <>{fallback}</>
  }

  // If permission is required but not granted, show fallback
  if (requirePermission && hasPermission === false) {
    return <>{fallback}</>
  }

  // If there's a permission error, show fallback
  if (error?.type === 'permission') {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * LocationStatus - Component to display location status
 * Useful for debugging or showing location state to users
 */
interface LocationStatusProps {
  showDetails?: boolean
  className?: string
}

export function LocationStatus({ showDetails = false, className = '' }: LocationStatusProps) {
  const { location, loading, error, hasPermission, isSupported } = useLocationContext()

  if (!isSupported) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Location not supported
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Detecting location...
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-sm text-destructive ${className}`}>
        Location error: {error.message}
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Location permission required
      </div>
    )
  }

  if (!location) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        No location data
      </div>
    )
  }

  if (showDetails) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        {location.city}, {location.state}, {location.country}
      </div>
    )
  }

  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      Location detected
    </div>
  )
}
