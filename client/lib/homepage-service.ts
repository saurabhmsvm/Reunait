import { HomepageResponse } from './homepage-types'

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export class HomepageService {
  /**
   * Fetch homepage data from the API
   * This is a public endpoint - no authentication required
   */
  static async getHomepageData(): Promise<HomepageResponse> {
    const response = await fetch(`${API_BASE_URL}/api/homepage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
        // ISR Configuration - Cache for 1 minute, then revalidate
        next: { revalidate: 60 }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: HomepageResponse = await response.json()
    return data
  }
}
