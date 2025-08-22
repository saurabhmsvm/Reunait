/**
 * Smart formatting function for location display
 * Handles various combinations of city, state, and country data
 */
export const formatLocation = (city?: string, state?: string, country?: string): string => {
  const parts = [city, state, country].filter(Boolean) as string[]
  
  // No location data
  if (parts.length === 0) {
    return 'Location not specified'
  }
  
  // Only one part available
  if (parts.length === 1) {
    return parts[0]
  }
  
  // Two parts available
  if (parts.length === 2) {
    return `${parts[0]}, ${parts[1]}`
  }
  
  // All three parts available
  const fullText = `${parts[0]}, ${parts[1]}, ${parts[2]}`
  
  // If total length is reasonable, show everything
  if (fullText.length <= 60) {
    return fullText
  }
  
  // If too long, show city and state only
  const cityState = `${parts[0]}, ${parts[1]}`
  if (cityState.length <= 50) {
    return cityState
  }
  
  // If still too long, show only city
  return parts[0]
}
