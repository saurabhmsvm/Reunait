export interface LocationData {
  country: string
  state: string
  city: string
}

export class LocationService {
  static hasSavedLocation(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('userLocation') !== null
  }

  static getSavedLocation(): LocationData | null {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem('userLocation')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }

  static saveLocation(locationData: LocationData): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('userLocation', JSON.stringify(locationData))
  }

  static getDefaultLocation(): LocationData {
    return {
      country: "India",
      state: "Bihar",
      city: "Unknown"
    }
  }

  static getFilterDefaults(): { country: string; state: string } {
    const savedLocation = this.getSavedLocation()
    return {
      country: savedLocation?.country || "India",
      state: savedLocation?.state || "Bihar"
    }
  }

  static async requestLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Geolocation not available'))
        return
      }

      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            const locationData = await this.reverseGeocode(latitude, longitude)
            this.saveLocation(locationData)
            resolve(locationData)
          } catch (error) {
            reject(error)
          }
        },
        (error) => {
          reject(new Error(`Location access denied: ${error.message}`))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  }

  static async reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch location data')
      }

      const data = await response.json()
      
      return {
        country: data.countryName || 'Unknown',
        state: data.principalSubdivision || 'Unknown',
        city: data.city || data.locality || 'Unknown'
      }
    } catch (error) {
      // Reverse geocoding failed
      return this.getDefaultLocation()
    }
  }

  static async checkLocationPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    
    if (!navigator.permissions) {
      return true // Assume granted if permissions API not available
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
      return permission.state === 'granted'
    } catch {
      return true // Assume granted if permissions API fails
    }
  }
} 