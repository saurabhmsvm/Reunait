import { countries } from 'countries-list'
import countryCityState from 'countrycitystatejson'

export interface CountryStateData {
  country: string
  state: string
}

export class CountriesStatesService {
  static getCountries(): string[] {
    return Object.keys(countries).map((code: string) => (countries as any)[code].name).sort()
  }
  
  static getCountryCode(countryName: string): string | null {
    // Find the country code by searching through all countries
    for (const [code, countryData] of Object.entries(countries)) {
      if ((countryData as any).name === countryName) {
        return code
      }
    }
    return null
  }
  
  static getStates(countryName: string): string[] {
    try {
      // Get the country code dynamically
      const countryCode = this.getCountryCode(countryName)
      
      if (!countryCode) {
        // Country code not found
        return []
      }
      
      // Get all countries data from the library
      const allCountries = countryCityState.getAll()
      
      // Get the specific country data
      const countryData = allCountries[countryCode]
      
      if (countryData && typeof countryData === 'object') {
        // Check if states property exists
        if (countryData.states && typeof countryData.states === 'object') {
          // Extract state names from the states object
          const states = Object.keys(countryData.states)
          return states.sort()
        }
      }
      
      return []
    } catch (error) {
      // Error getting states for country
      return []
    }
  }
  
  static getCities(countryName: string, stateName: string): string[] {
    try {
      // Get the country code dynamically
      const countryCode = this.getCountryCode(countryName)
      
      if (!countryCode) {
        // Country code not found
        return []
      }
      
      // Get all countries data from the library
      const allCountries = countryCityState.getAll()
      
      // Get the specific country data
      const countryData = allCountries[countryCode]
      
      if (countryData && countryData.states && countryData.states[stateName]) {
        // Get cities for the specific state
        const cities = countryData.states[stateName]
        
        if (Array.isArray(cities)) {
          // Extract city names from the cities array
          return cities.map((city: any) => city.name || city).sort()
        }
      }
      
      return []
    } catch (error) {
      // Error getting cities for state
      return []
    }
  }
  
  static getDefaultCountry(): string {
    return "India"
  }
  
  static getDefaultState(): string {
    return "Bihar"
  }
  
  static getDefaultCity(): string {
    return "Patna"
  }
  
  static getDefaultLocation(): CountryStateData {
    return {
      country: this.getDefaultCountry(),
      state: this.getDefaultState()
    }
  }
  
  static isValidCountry(countryName: string): boolean {
    return this.getCountries().includes(countryName)
  }
  
  static isValidState(countryName: string, stateName: string): boolean {
    return this.getStates(countryName).includes(stateName)
  }
  
  static isValidCity(countryName: string, stateName: string, cityName: string): boolean {
    return this.getCities(countryName, stateName).includes(cityName)
  }
} 