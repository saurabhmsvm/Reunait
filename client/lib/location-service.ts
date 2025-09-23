/**
 * LocationService - Handles geolocation detection, reverse geocoding, and storage
 * Follows industry best practices for location services
 */

export interface LocationData {
  latitude: number
  longitude: number
  country: string
  state: string
  city: string
  timestamp: number
}

export interface LocationError {
  code: number
  message: string
  type: 'permission' | 'timeout' | 'unavailable' | 'unknown'
}

const STORAGE_KEY = 'user_location_data'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

class LocationService {
  private static instance: LocationService
  private geocodingCache = new Map<string, LocationData>()

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService()
    }
    return LocationService.instance
  }

  /**
   * Get cached location data from localStorage
   */
  getCachedLocation(): LocationData | null {
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (!cached) return null

      const locationData: LocationData = JSON.parse(cached)
      
      // Check if cache is still valid
      if (Date.now() - locationData.timestamp > CACHE_DURATION) {
        this.clearCachedLocation()
        return null
      }

      return locationData
    } catch (error) {
      console.warn('Failed to parse cached location data:', error)
      this.clearCachedLocation()
      return null
    }
  }

  /**
   * Cache location data to localStorage
   */
  private cacheLocation(locationData: LocationData): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locationData))
    } catch (error) {
      console.warn('Failed to cache location data:', error)
    }
  }

  /**
   * Clear cached location data
   */
  clearCachedLocation(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Check if geolocation is supported
   */
  isGeolocationSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator
  }

  /**
   * Get current position with proper error handling
   */
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationSupported()) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0 // Don't use cached location
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          const locationError: LocationError = {
            code: error.code,
            message: error.message,
            type: this.mapGeolocationError(error.code)
          }
          reject(locationError)
        },
        options
      )
    })
  }

  /**
   * Map geolocation error codes to our error types
   */
  private mapGeolocationError(code: number): LocationError['type'] {
    switch (code) {
      case 1:
        return 'permission'
      case 2:
        return 'unavailable'
      case 3:
        return 'timeout'
      default:
        return 'unknown'
    }
  }

  /**
   * Reverse geocoding using a free service
   * In production, consider using Google Maps API or similar
   */
  private async reverseGeocode(lat: number, lng: number): Promise<LocationData> {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
    
    if (this.geocodingCache.has(cacheKey)) {
      return this.geocodingCache.get(cacheKey)!
    }

    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'MissingPersonsApp/1.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`)
      }

      const data = await response.json()
      
      const locationData: LocationData = {
        latitude: lat,
        longitude: lng,
        country: data.address?.country || 'Unknown',
        state: data.address?.state || data.address?.region || 'Unknown',
        city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
        timestamp: Date.now()
      }

      // Cache the result
      this.geocodingCache.set(cacheKey, locationData)
      
      return locationData
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
      
      // Fallback to default location (India)
      return {
        latitude: lat,
        longitude: lng,
        country: 'India',
        state: 'Unknown',
        city: 'Unknown',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Get user's current location with reverse geocoding
   */
  async getCurrentLocation(): Promise<LocationData> {
    try {
      const position = await this.getCurrentPosition()
      const { latitude, longitude } = position.coords
      
      const locationData = await this.reverseGeocode(latitude, longitude)
      this.cacheLocation(locationData)
      
      return locationData
    } catch (error) {
      console.error('Failed to get current location:', error)
      throw error
    }
  }

  /**
   * Get location data (cached or fresh)
   */
  async getLocationData(): Promise<LocationData | null> {
    // First try to get cached data
    const cached = this.getCachedLocation()
    if (cached) {
      return cached
    }

    // If no cache, try to get fresh location
    try {
      return await this.getCurrentLocation()
    } catch (error) {
      console.warn('Could not get location data:', error)
      return null
    }
  }

  /**
   * Get default filter values based on location or fallback
   */
  getFilterDefaults(): { country: string; state: string | null; city: string | null } {
    const cached = this.getCachedLocation()
    
    if (cached) {
      return {
        country: cached.country,
        state: cached.state !== 'Unknown' ? cached.state : null,
        city: cached.city !== 'Unknown' ? cached.city : null
      }
    }

    // Fallback to India
    return {
      country: 'India',
      state: null,
      city: null
    }
  }

  /**
   * Request location permission (for UI feedback)
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      await this.getCurrentLocation()
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Check if location permission is granted
   */
  async hasLocationPermission(): Promise<boolean> {
    if (!this.isGeolocationSupported()) return false

    try {
      // Try to get high accuracy position with very short timeout
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 100, maximumAge: 0 }
        )
      })
      return true
    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance()

// Export types for external use
export type { LocationData, LocationError }
