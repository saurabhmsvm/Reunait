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

/**
 * Formats reward amount compactly to prevent overflow
 * Examples:
 * - 1000 -> "1000"
 * - 10000 -> "10K"
 * - 15000.50 -> "15K"
 * - 999999 -> "1000K"
 * - "10000 INR" -> "10K INR"
 * - "999999.99 USD" -> "1000K USD"
 */
export const formatReward = (reward: number | string | undefined | null): string => {
  if (!reward) return ''
  
  // Handle string rewards (e.g., "1000 INR" or "999999.99 USD")
  if (typeof reward === 'string') {
    const trimmed = reward.trim()
    if (!trimmed || trimmed === '0') return ''
    
    // Extract numeric value and currency code
    const match = trimmed.match(/^([\d,]+(?:\.\d+)?)\s*(.+)?$/)
    if (!match) return trimmed // Return as-is if format is unexpected
    
    const numericStr = match[1].replace(/,/g, '') // Remove commas
    const currency = match[2]?.trim() || ''
    const numericValue = parseFloat(numericStr)
    
    if (isNaN(numericValue)) return trimmed
    
    const formatted = formatCompactNumber(numericValue)
    return currency ? `${formatted} ${currency}` : formatted
  }
  
  // Handle numeric rewards
  if (typeof reward === 'number') {
    if (reward <= 0) return ''
    return formatCompactNumber(reward)
  }
  
  return String(reward)
}

/**
 * Formats a number in compact notation (K, M, etc.)
 * - 0-9999: shows as-is
 * - 10,000-999,999: shows as "K" (e.g., 10K, 10.5K, 999K)
 * - 1,000,000+: shows as "M" (e.g., 1M, 1.5M, 999M)
 */
function formatCompactNumber(value: number): string {
  if (value < 10000) {
    // For values less than 10000, show as-is (no decimals for whole numbers)
    return value % 1 === 0 ? String(Math.round(value)) : value.toFixed(2).replace(/\.?0+$/, '')
  }
  
  if (value < 1000000) {
    // Thousands: 10K, 10.5K, 999K (capital K, attached)
    const thousands = value / 1000
    // Show 1 decimal place if needed, otherwise whole number
    if (thousands % 1 === 0) {
      return `${Math.round(thousands)}K`
    }
    // Round to 1 decimal, but remove trailing zeros
    return `${thousands.toFixed(1).replace(/\.?0+$/, '')}K`
  }
  
  // Millions: 1M, 1.5M, 999M
  const millions = value / 1000000
  if (millions % 1 === 0) {
    return `${Math.round(millions)}M`
  }
  // Round to 1 decimal, but remove trailing zeros
  return `${millions.toFixed(1).replace(/\.?0+$/, '')}M`
}
