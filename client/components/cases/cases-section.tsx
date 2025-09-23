"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { CasesSearch, SearchFilters } from "./cases-search"
import { CasesGrid } from "./cases-grid"
import { Pagination } from "@/components/ui/pagination"
import { Toast } from "@/components/ui/toast"
import { fetchCases, type Case, type CasesParams } from "@/lib/api"
import { locationService } from "@/lib/location-service"

// Initial state constants
const INITIAL_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalCases: 0,
  hasNextPage: false,
  hasPrevPage: false,
  limit: 40
}

const INITIAL_FILTERS: SearchFilters = {
  keyword: "",
  country: "India",
  state: "all",
  city: "all",
  status: undefined,
  gender: undefined,
  dateFrom: undefined,
  dateTo: undefined
}

interface CasesSectionProps {
  initialCases?: Case[]
  initialPagination?: typeof INITIAL_PAGINATION
  initialFilters?: Partial<SearchFilters>
}

export function CasesSection({ initialCases, initialPagination, initialFilters }: CasesSectionProps) {
  const [cases, setCases] = useState<Case[]>(initialCases || [])
  const [loading, setLoading] = useState<boolean>(true) // Always start with loading
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState(initialPagination || INITIAL_PAGINATION)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    ...INITIAL_FILTERS,
    ...(initialFilters || {})
  })
  const [hasAppliedLocationFilters, setHasAppliedLocationFilters] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Memoized API parameters to prevent unnecessary object recreation
  const apiParams = useMemo(() => ({
    page: pagination.currentPage,
    country: searchFilters.country,
    state: searchFilters.state === "all" ? null : searchFilters.state,
    city: searchFilters.city === "all" ? null : searchFilters.city,
    status: searchFilters.status,
    gender: searchFilters.gender,
    dateFrom: searchFilters.dateFrom,
    dateTo: searchFilters.dateTo,
    keyword: searchFilters.keyword || undefined
  }), [pagination.currentPage, searchFilters])

  // Memoized cases with stable reference for child components
  const memoizedCases = useMemo(() => cases, [cases])

  // Consolidated data fetching function
  const fetchData = useCallback(async (params: CasesParams, updateFilters = false) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchCases(params)
      
      setCases(response.data)
      setPagination(response.pagination)
      
      if (updateFilters) {
        setSearchFilters(prev => ({
          ...prev,
          country: response.filters.country,
          state: response.filters.state || "all",
          city: response.filters.city || "all"
        }))
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load cases"
      setError(errorMessage)
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize with location-based data or default
  useEffect(() => {
    const initializeData = async () => {
      if (hasInitialized) return

      try {
        // Wait a bit for location data to be available (in case user just came from homepage)
        let storedLocation = localStorage.getItem('userLocation')
        
        // If no location data, wait a bit and check again
        if (!storedLocation) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
          storedLocation = localStorage.getItem('userLocation')
        }
        
        if (storedLocation) {
          const locationData = JSON.parse(storedLocation)
          
          const locationFilters: SearchFilters = {
            keyword: "",
            country: locationData.country,
            state: locationData.state !== 'Unknown' ? locationData.state : 'all',
            city: locationData.city !== 'Unknown' ? locationData.city : 'all',
            status: undefined,
            gender: undefined,
            dateFrom: undefined,
            dateTo: undefined
          }

          setSearchFilters(locationFilters)
          setHasAppliedLocationFilters(true)

          // Fetch cases with location-based filters
          const params: CasesParams = {
            page: 1,
            country: locationData.country,
            state: locationData.state !== 'Unknown' ? locationData.state : null,
            city: locationData.city !== 'Unknown' ? locationData.city : null,
            status: undefined,
            gender: undefined,
            dateFrom: undefined,
            dateTo: undefined,
            keyword: undefined
          }

          await fetchData(params, true)
        } else {
          // No location data after waiting, use default (India)
          const params: CasesParams = {
            page: 1,
            country: 'India',
            state: null,
            city: null
          }
          await fetchData(params, true)
        }
        
        setHasInitialized(true)
      } catch (error) {
        setHasInitialized(true)
      }
    }

    initializeData()
  }, [hasInitialized, fetchData]) // Removed searchFilters from dependencies

  // Listen for location updates in localStorage
  useEffect(() => {
    const applyFromData = async (locationData: any) => {
      const locationFilters: SearchFilters = {
        keyword: "",
        country: locationData.country,
        state: locationData.state !== 'Unknown' ? locationData.state : 'all',
        city: locationData.city !== 'Unknown' ? locationData.city : 'all',
        status: undefined,
        gender: undefined,
        dateFrom: undefined,
        dateTo: undefined
      }
        
      setSearchFilters(locationFilters)
      setHasAppliedLocationFilters(true)

      // Fetch cases with location-based filters
      const params: CasesParams = {
        page: 1,
        country: locationData.country,
        state: locationData.state !== 'Unknown' ? locationData.state : null,
        city: locationData.city !== 'Unknown' ? locationData.city : null,
        status: undefined,
        gender: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        keyword: undefined
      }

      await fetchData(params, true)
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userLocation' && e.newValue && !hasAppliedLocationFilters) {
        const locationData = JSON.parse(e.newValue)
        applyFromData(locationData)
      }
    }

    const handleCustomEvent = (e: Event) => {
      if (!hasAppliedLocationFilters) {
        const custom = e as CustomEvent
        const locationData = custom.detail
        if (locationData) {
          applyFromData(locationData)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('location:updated', handleCustomEvent as EventListener)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [hasAppliedLocationFilters, fetchData])

  // Search handler
  const handleSearch = useCallback(async (filters: SearchFilters) => {
    setSearchFilters(filters)

    const params: CasesParams = {
      page: 1,
      country: filters.country,
      state: filters.state === "all" ? null : filters.state,
      city: filters.city === "all" ? null : filters.city,
      status: filters.status,
      gender: filters.gender,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      keyword: filters.keyword || undefined
    }

    await fetchData(params)
  }, [fetchData])

  // Clear handler
  const handleClear = useCallback(async () => {
    const params: CasesParams = {
      page: 1,
      country: "India",
      state: null,
      city: null,
      status: undefined,
      gender: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      keyword: undefined
    }

    setSearchFilters(INITIAL_FILTERS)
    await fetchData(params)
  }, [fetchData])

  // Page change handler
  const handlePageChange = useCallback(async (page: number) => {
    const params: CasesParams = {
      page,
      country: searchFilters.country,
      state: searchFilters.state === "all" ? null : searchFilters.state,
      city: searchFilters.city === "all" ? null : searchFilters.city,
      status: searchFilters.status,
      gender: searchFilters.gender,
      dateFrom: searchFilters.dateFrom,
      dateTo: searchFilters.dateTo,
      keyword: searchFilters.keyword || undefined
    }

    await fetchData(params)

    // Scroll to the top of the page after page change
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [searchFilters, fetchData])

  // Memoized pagination props to prevent unnecessary re-renders
  const paginationProps = useMemo(() => ({
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    onPageChange: handlePageChange
  }), [pagination.currentPage, pagination.totalPages, handlePageChange])

  // Error dismiss handler
  const handleErrorDismiss = useCallback(() => setError(null), [])

  // Generate results summary text
  const getResultsSummary = useCallback(() => {
    const parts: string[] = []
    
    // Always show country (default is India)
    const country = searchFilters.country || "India"
    parts.push(`in ${country}`)
    
    // Add state if not "all"
    if (searchFilters.state && searchFilters.state !== "all") {
      parts.push(searchFilters.state)
    }
    
    // Add city if not "all"
    if (searchFilters.city && searchFilters.city !== "all") {
      parts.push(searchFilters.city)
    }
    
    // Add status with proper formatting
    if (searchFilters.status && searchFilters.status !== "all") {
      const statusText = searchFilters.status === "missing" ? "missing persons" : 
                        searchFilters.status === "found" ? "found persons" : 
                        `${searchFilters.status} cases`
      parts.push(`for ${statusText}`)
    }
    
    // Add gender with proper formatting
    if (searchFilters.gender && searchFilters.gender !== "all") {
      parts.push(`(${searchFilters.gender})`)
    }
    
    // Add date range with proper formatting
    if (searchFilters.dateFrom || searchFilters.dateTo) {
      const fromDate = searchFilters.dateFrom?.toLocaleDateString() || "any date"
      const toDate = searchFilters.dateTo?.toLocaleDateString() || "present"
      parts.push(`reported between ${fromDate} and ${toDate}`)
    }
    
    // Add keyword search with proper formatting
    if (searchFilters.keyword && searchFilters.keyword.trim()) {
      parts.push(`matching "${searchFilters.keyword.trim()}"`)
    }
    
    return `Showing cases ${parts.join(" ")}`
  }, [searchFilters])

  return (
    <div className="mx-auto w-full md:max-w-none lg:max-w-screen-2xl px-1 sm:px-2 md:px-3 lg:px-4 xl:px-5 py-6">
      {error && (
        <Toast
          message={error}
          type="error"
          onClose={handleErrorDismiss}
        />
      )}

      <CasesSearch 
        onSearch={handleSearch}
        onClear={handleClear}
        loading={loading}
        hasCasesDisplayed={cases.length > 0}
      />


      {/* Results Summary */}
      <div className="mt-6 px-1">
        <div className="flex items-start gap-2 sm:gap-3 px-4 py-3">
          {loading ? (
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] flex-shrink-0"></div>
                <div className="h-6 w-64 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
              </div>
              <div className="ml-auto mt-0">
                <div className="h-6 w-16 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-full"></div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2.5"></div>
                <span className="text-base sm:text-lg md:text-xl font-semibold text-foreground leading-snug tracking-tight break-words whitespace-normal">
                  {getResultsSummary()}
                </span>
              </div>
              {pagination.totalCases > 0 && (
                <div className="ml-auto mt-0">
                  <span
                    className="inline-flex items-center px-3 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap"
                    title={`${pagination.totalCases.toLocaleString()} results`}
                    aria-label={`${pagination.totalCases.toLocaleString()} results`}
                  >
                    {new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(pagination.totalCases)} results
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <CasesGrid
          cases={memoizedCases}
          loading={loading}
          emptyMessage="No cases found for the selected criteria"
          highlightQuery={searchFilters.keyword}
        />
      </div>

      {!loading && cases.length > 0 && (
        <div className="mt-8">
          <Pagination {...paginationProps} />
        </div>
      )}
    </div>
  )
} 