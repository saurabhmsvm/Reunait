/**
 * useLocation hook - React hook for location services
 * Provides location state management with proper error handling and loading states
 */

import { useState, useEffect, useCallback } from 'react'
import { locationService, type LocationData, type LocationError } from '@/lib/location-service'

export interface UseLocationState {
  location: LocationData | null
  loading: boolean
  error: LocationError | null
  hasPermission: boolean
  isSupported: boolean
}

export interface UseLocationActions {
  requestLocation: () => Promise<void>
  clearLocation: () => void
  refreshLocation: () => Promise<void>
}

export interface UseLocationReturn extends UseLocationState, UseLocationActions {}

/**
 * Hook for managing user location state
 * @param autoRequest - Whether to automatically request location on mount
 * @param enableCaching - Whether to use cached location data
 */
export function useLocation(
  autoRequest: boolean = true,
  enableCaching: boolean = true
): UseLocationReturn {
  const [state, setState] = useState<UseLocationState>({
    location: null,
    loading: false,
    error: null,
    hasPermission: false,
    isSupported: locationService.isGeolocationSupported()
  })

  /**
   * Update state with error handling
   */
  const updateState = useCallback((updates: Partial<UseLocationState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  /**
   * Request current location
   */
  const requestLocation = useCallback(async () => {
    if (!state.isSupported) {
      updateState({
        error: {
          code: -1,
          message: 'Geolocation is not supported in this browser',
          type: 'unavailable'
        }
      })
      return
    }

    updateState({ loading: true, error: null })

    try {
      const location = await locationService.getCurrentLocation()
      updateState({
        location,
        loading: false,
        hasPermission: true
      })
    } catch (error) {
      const locationError = error as LocationError
      updateState({
        loading: false,
        error: locationError,
        hasPermission: locationError.type !== 'permission'
      })
    }
  }, [state.isSupported, updateState])

  /**
   * Get cached or fresh location data
   */
  const getLocationData = useCallback(async () => {
    if (!enableCaching) {
      return null
    }

    try {
      return await locationService.getLocationData()
    } catch (error) {
      console.warn('Failed to get location data:', error)
      return null
    }
  }, [enableCaching])

  /**
   * Clear location data and cache
   */
  const clearLocation = useCallback(() => {
    locationService.clearCachedLocation()
    updateState({
      location: null,
      error: null,
      hasPermission: false
    })
  }, [updateState])

  /**
   * Refresh location (force new request)
   */
  const refreshLocation = useCallback(async () => {
    locationService.clearCachedLocation()
    await requestLocation()
  }, [requestLocation])

  /**
   * Check permission status
   */
  const checkPermission = useCallback(async () => {
    try {
      const hasPermission = await locationService.hasLocationPermission()
      updateState({ hasPermission })
    } catch (error) {
      updateState({ hasPermission: false })
    }
  }, [updateState])

  // Initialize location data on mount
  useEffect(() => {
    const initializeLocation = async () => {
      if (!state.isSupported) return

      // Check permission status
      await checkPermission()

      // Try to get cached location first
      if (enableCaching) {
        const cachedLocation = await getLocationData()
        if (cachedLocation) {
          updateState({ location: cachedLocation })
          return
        }
      }

      // Auto-request location if enabled
      if (autoRequest) {
        await requestLocation()
      }
    }

    initializeLocation()
  }, [state.isSupported, enableCaching, autoRequest, getLocationData, requestLocation, checkPermission, updateState])

  return {
    ...state,
    requestLocation,
    clearLocation,
    refreshLocation
  }
}

/**
 * Hook for getting location-based filter defaults
 * Useful for search filters that need location-based defaults
 */
export function useLocationFilters() {
  const [filters, setFilters] = useState<{
    country: string
    state: string | null
    city: string | null
  }>({
    country: 'India',
    state: null,
    city: null
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const defaults = locationService.getFilterDefaults()
        setFilters(defaults)
      } catch (error) {
        console.warn('Failed to load location filters:', error)
        // Keep default values
      } finally {
        setLoading(false)
      }
    }

    loadFilters()
  }, [])

  return { filters, loading }
}

/**
 * Hook for location permission management
 * Provides permission state and request functionality
 */
export function useLocationPermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkPermission = useCallback(async () => {
    setIsChecking(true)
    try {
      const permission = await locationService.hasLocationPermission()
      setHasPermission(permission)
    } catch (error) {
      setHasPermission(false)
    } finally {
      setIsChecking(false)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    setIsChecking(true)
    try {
      const granted = await locationService.requestLocationPermission()
      setHasPermission(granted)
      return granted
    } catch (error) {
      setHasPermission(false)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  return {
    hasPermission,
    isChecking,
    checkPermission,
    requestPermission
  }
}