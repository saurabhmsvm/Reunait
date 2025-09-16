"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { CasesSearch, SearchFilters } from "./cases-search"
import { CasesGrid } from "./cases-grid"
import { Pagination } from "@/components/ui/pagination"
import { Toast } from "@/components/ui/toast"
import { fetchCases, type Case, type CasesParams } from "@/lib/api"
import { LocationService } from "@/lib/location"

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

export function CasesSection() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState(INITIAL_PAGINATION)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(INITIAL_FILTERS)

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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      const savedLocation = LocationService.getSavedLocation()
      const defaults = LocationService.getFilterDefaults()
      
      const initialParams: CasesParams = {
        page: 1,
        country: savedLocation?.country || defaults.country,
        state: savedLocation?.state || null,
        city: null
      }

      await fetchData(initialParams, true)
    }

    loadInitialData()
  }, [fetchData])

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
      />

      <div className="mt-6">
        <CasesGrid
          cases={memoizedCases}
          loading={loading}
          emptyMessage="No cases found for the selected criteria"
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