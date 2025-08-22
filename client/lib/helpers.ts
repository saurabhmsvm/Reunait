import { format, formatDistanceToNow } from 'date-fns'

/**
 * Format date for consistent display across the website
 * @param date - Date string or Date object
 * @param type - Format type ('short', 'long', 'relative', 'input')
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date, 
  type: 'short' | 'long' | 'relative' | 'input' = 'short'
): string => {
  if (!date) return 'Date not available'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  switch (type) {
    case 'short':
      // DD MMM YYYY - e.g., "15 Jan 2024"
      return format(dateObj, "dd MMM yyyy")
    
    case 'long':
      // DD MMMM YYYY - e.g., "15 January 2024"
      return format(dateObj, "dd MMMM yyyy")
    
    case 'relative':
      // Relative time - e.g., "2 hours ago", "1 day ago"
      return formatDistanceToNow(dateObj, { addSuffix: true })
    
    case 'input':
      // YYYY-MM-DD for input fields
      return format(dateObj, "yyyy-MM-dd")
    
    default:
      return format(dateObj, "dd MMM yyyy")
  }
}

/**
 * Format date for case status display
 * @param date - Date string or Date object
 * @param status - Case status ('missing', 'found', 'closed')
 * @returns Formatted status text with date
 */
export const formatCaseStatus = (
  date: string | Date, 
  status?: 'missing' | 'found' | 'closed'
): string => {
  const formattedDate = formatDate(date, 'short')
  
  switch (status) {
    case 'missing':
      return `Missing since ${formattedDate}`
    case 'found':
      return `Found on ${formattedDate}`
    case 'closed':
      return `Case closed ${formattedDate}`
    default:
      return formattedDate
  }
}

// Add more helper functions here as needed
