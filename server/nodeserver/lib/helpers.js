/**
 * Helper utility functions
 * Shared utilities for formatting and common operations
 */

/**
 * Format location from city, state, country
 * Matches frontend formatLocation logic for consistency
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {string} country - Country name
 * @returns {string|null} Formatted location string or null if no data
 */
export function formatLocation(city, state, country) {
  const parts = [city, state, country].filter(Boolean);
  
  if (parts.length === 0) {
    return null;
  }
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  if (parts.length === 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  
  // All three parts available
  const fullText = `${parts[0]}, ${parts[1]}, ${parts[2]}`;
  
  // If total length is reasonable, show everything
  if (fullText.length <= 60) {
    return fullText;
  }
  
  // If too long, show city and state only
  const cityState = `${parts[0]}, ${parts[1]}`;
  if (cityState.length <= 50) {
    return cityState;
  }
  
  // If still too long, show only city
  return parts[0];
}

