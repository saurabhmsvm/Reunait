"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { SmartDateRangePicker } from "@/components/ui/smart-date-range-picker"
import { Search, User, Shield, Calendar, MapPin, ChevronDown, ChevronUp, Filter, ChevronRight, X, Hash } from "lucide-react"
import { CountriesStatesService } from "@/lib/countries-states"
import { locationService } from "@/lib/location-service"
import { fetchCases, type CasesParams, type Case } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

export interface SearchFilters {
  keyword: string
  country: string
  state: string
  city: string
  status: "all" | "missing" | "found" | "closed" | undefined
  gender: string | undefined
  dateFrom: Date | undefined
  dateTo: Date | undefined
}

interface CasesSearchProps {
  onSearch: (filters: SearchFilters) => void
  onClear: () => void
  loading?: boolean
  hasCasesDisplayed?: boolean
}

// Initial filter state
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

export function CasesSearch({ onSearch, onClear, loading = false, hasCasesDisplayed = false }: CasesSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS)
  const [countries, setCountries] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Case[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const router = useRouter()
  const inputWrapperRef = useRef<HTMLDivElement | null>(null)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const { user } = useUser()

  // Get user role from Clerk metadata
  const userRole = useMemo(() => {
    if (!user?.publicMetadata) return 'general_user'
    return (user.publicMetadata as any)?.role || 'general_user'
  }, [user])

  // Check if current search is a user search (police typing "user:")
  const isUserSearch = useMemo(() => {
    const keyword = (filters.keyword || "").toLowerCase().trim()
    return userRole === 'police' && keyword.startsWith('user:')
  }, [filters.keyword, userRole])

  // Show dropdown only when: police + user: search + no cases displayed
  const shouldShowDropdown = useMemo(() => {
    return isUserSearch && !hasCasesDisplayed
  }, [isUserSearch, hasCasesDisplayed])

  const updateDropdownPosition = useCallback(() => {
    const el = inputWrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const top = rect.bottom + 8 + window.scrollY
    const left = rect.left + window.scrollX
    setDropdownRect({ top, left, width: rect.width })
  }, [])

  // Memoized active filters count (excludes status since it has dedicated buttons)
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.country !== "India") count++
    if (filters.state !== "all") count++
    if (filters.city !== "all") count++
    if (filters.gender && filters.gender !== "all") count++
    // Count date filter as 1 if either date is set
    if (filters.dateFrom instanceof Date || filters.dateTo instanceof Date) count++
    return count
  }, [filters])

  // Memoized filter change handler to prevent recreation
  const createFilterChangeHandler = useMemo(() => {
    return (key: keyof SearchFilters) => (value: string | Date | undefined) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    }
  }, [])

  // Memoized status filter handlers
  const handleMissingFilter = useCallback(() => 
    createFilterChangeHandler("status")(filters.status === "missing" ? "all" : "missing"), 
    [createFilterChangeHandler, filters.status]
  )

  const handleFoundFilter = useCallback(() => 
    createFilterChangeHandler("status")(filters.status === "found" ? "all" : "found"), 
    [createFilterChangeHandler, filters.status]
  )

  // Initialize data
  useEffect(() => {
    const initializeData = () => {
      // Initialize countries and states
      const allCountries = CountriesStatesService.getCountries()
      const defaultStates = CountriesStatesService.getStates("India")
      const defaultCities = CountriesStatesService.getCities("India", "Bihar")
      
      setCountries(allCountries)
      setStates(defaultStates)
      setCities(defaultCities)
    }

    initializeData()
  }, [])

  // Update filters when cached location is available
  useEffect(() => {
    const updateFiltersFromLocation = () => {
      const storedLocation = localStorage.getItem('userLocation')
      if (storedLocation) {
        const locationData = JSON.parse(storedLocation)
        const locationFilters = {
          country: locationData.country,
          state: locationData.state !== 'Unknown' ? locationData.state : 'all',
          city: locationData.city !== 'Unknown' ? locationData.city : 'all'
        }
        setFilters(prev => ({ ...prev, ...locationFilters }))
        
        // Update states and cities based on location
        const locationStates = CountriesStatesService.getStates(locationData.country)
        setStates(locationStates)
        
        if (locationData.state !== 'Unknown') {
          const locationCities = CountriesStatesService.getCities(locationData.country, locationData.state)
          setCities(locationCities)
        }
      }
    }

    updateFiltersFromLocation()
  }, [])

  // Update states when country changes
  useEffect(() => {
    if (filters.country) {
      const newStates = CountriesStatesService.getStates(filters.country)
      setStates(newStates)
      
      setFilters(prev => ({
        ...prev,
        state: "all",
        city: "all"
      }))
    }
  }, [filters.country])

  // Update cities when state changes
  useEffect(() => {
    if (filters.country && filters.state && filters.state !== "all") {
      const newCities = CountriesStatesService.getCities(filters.country, filters.state)
      setCities(newCities)
      
      setFilters(prev => ({
        ...prev,
        city: "all"
      }))
    } else {
      setCities([])
      setFilters(prev => ({
        ...prev,
        city: "all"
      }))
    }
  }, [filters.country, filters.state])

  // Memoized handlers
  const handleSearch = useCallback(() => {
    onSearch(filters)
  }, [filters, onSearch])

  const handleClear = useCallback(() => {
    setFilters(INITIAL_FILTERS)
    onClear()
  }, [onClear])

  // Auto-search when filters change (except keyword for debounced suggestions)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(filters)
    }, 100) // Small delay to batch multiple filter changes

    return () => clearTimeout(timeoutId)
  }, [filters.country, filters.state, filters.city, filters.status, filters.gender, filters.dateFrom, filters.dateTo, onSearch])

  // Get active filter chips (excludes status since it has dedicated buttons)
  const getActiveFilters = useCallback(() => {
    const active: Array<{ key: string; label: string; value: string }> = []
    
    if (filters.country !== "India") {
      active.push({ key: "country", label: "Country", value: filters.country })
    }
    if (filters.state !== "all") {
      active.push({ key: "state", label: "State", value: filters.state })
    }
    if (filters.city !== "all") {
      active.push({ key: "city", label: "City", value: filters.city })
    }
    // Note: Status is excluded since it has dedicated Missing/Found buttons
    if (filters.gender && filters.gender !== "all") {
      active.push({ key: "gender", label: "Gender", value: filters.gender })
    }
    if (filters.dateFrom || filters.dateTo) {
      const dateRange = `${filters.dateFrom?.toLocaleDateString() || "..."} - ${filters.dateTo?.toLocaleDateString() || "..."}`
      active.push({ key: "dateRange", label: "Date Range", value: dateRange })
    }
    
    return active
  }, [filters])

  const removeFilter = useCallback((key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      switch (key) {
        case "country":
          newFilters.country = "India"
          break
        case "state":
          newFilters.state = "all"
          break
        case "city":
          newFilters.city = "all"
          break
        case "status":
          newFilters.status = undefined
          break
        case "gender":
          newFilters.gender = undefined
          break
        case "dateRange":
          newFilters.dateFrom = undefined
          newFilters.dateTo = undefined
          break
      }
      return newFilters
    })
  }, [])

  const toggleAdvancedFilters = useCallback(() => {
    setIsAdvancedOpen(prev => !prev)
  }, [])

  // Debounced user search suggestions (only for police typing "user:")
  useEffect(() => {
    const keyword = (filters.keyword || "").trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Only show suggestions for police user searches
    if (!isUserSearch || keyword.length === 0) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setSuggestionsLoading(true)
        // Extract search term after "user:"
        const searchTerm = keyword.substring(5).trim() // Remove "user:" prefix
        
        if (searchTerm.length === 0) {
          setSuggestions([])
          setShowSuggestions(false)
          return
        }

        // TODO: Implement user search API call
        // For now, show empty suggestions
        setSuggestions([])
        updateDropdownPosition()
        setShowSuggestions(true)
      } catch (e) {
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300) // Restored original 300ms debouncing

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters.keyword, isUserSearch, updateDropdownPosition])

  // Auto-search when keyword changes (restored original debouncing)
  useEffect(() => {
    const keyword = (filters.keyword || "").trim()
    if (keyword.length === 0) {
      // If keyword is cleared, search immediately
      onSearch(filters)
      return
    }
    
    const timeoutId = setTimeout(() => {
      onSearch(filters)
    }, 300) // Restored original 300ms debouncing

    return () => clearTimeout(timeoutId)
  }, [filters.keyword, onSearch])

  // Keep dropdown aligned on resize/scroll while visible
  useEffect(() => {
    if (!shouldShowDropdown) return
    updateDropdownPosition()
    const onScroll = () => updateDropdownPosition()
    const onResize = () => updateDropdownPosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [shouldShowDropdown, updateDropdownPosition])

  const handleSuggestionClick = useCallback((item: Case) => {
    setShowSuggestions(false)
    router.push(`/cases/${item._id}`)
  }, [router])

  // Simple highlighter for matched query
  const Highlight = useCallback(({ text, query }: { text?: string; query: string }) => {
    const value = text || ""
    if (!query) return <span className="tracking-normal leading-tight">{value}</span>
    const lower = value.toLowerCase()
    const q = query.toLowerCase()
    const idx = lower.indexOf(q)
    if (idx === -1) return <span className="tracking-normal leading-tight">{value}</span>

    const before = value.slice(0, idx)
    const match = value.slice(idx, idx + query.length)
    const after = value.slice(idx + query.length)

    return (
      <span className="tracking-normal leading-tight">
        {before}
        {<mark className="bg-yellow-200/60 dark:bg-yellow-300/30 rounded-[2px] px-0 py-0 m-0 align-baseline">{match}</mark>}
        {after}
      </span>
    )
  }, [])

  const getInitials = useCallback((name?: string) => {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    const first = parts[0]?.[0] || ""
    const second = parts[1]?.[0] || ""
    return (first + second).toUpperCase() || first.toUpperCase() || "?"
  }, [])

  return (
    <Card className="border border-border bg-card/90 backdrop-blur-md animate-in fade-in-0 slide-in-from-top-2 duration-500">
      <CardContent className="pt-0 -mb-4 px-4">
        <div className="space-y-4">

          {/* Search Bar and Quick Actions */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 lg:gap-6 items-stretch md:items-center">
            {/* Compact Search Input */}
            <div ref={inputWrapperRef} className="relative w-full md:flex-1 lg:flex-1 animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-100">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Name, mobile, or case reference number..."
                value={filters.keyword}
                onChange={(e) => createFilterChangeHandler("keyword")(e.target.value)}
                className="pl-10 h-10 text-sm md:text-base border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg"
                onFocus={() => { if (shouldShowDropdown) { updateDropdownPosition(); setShowSuggestions(true) } }}
                onBlur={() => { setTimeout(() => setShowSuggestions(false), 150) }}
                onKeyDown={(e) => {
                  if (!showSuggestions) return
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActiveIndex((prev) => Math.max(prev - 1, 0))
                  } else if (e.key === 'Enter') {
                    if (activeIndex >= 0 && activeIndex < suggestions.length) {
                      e.preventDefault()
                      handleSuggestionClick(suggestions[activeIndex])
                    }
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false)
                  }
                }}
              />

              {shouldShowDropdown && showSuggestions && dropdownRect && typeof window !== 'undefined' && createPortal(
                <div
                  className="absolute z-[2147483647] bg-popover/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl max-h-96 overflow-auto ring-1 ring-black/5"
                  style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, position: 'absolute' as const }}
                >
                  {suggestionsLoading && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Searching users…</div>
                  )}
                  {!suggestionsLoading && suggestions.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No users found</div>
                  )}
                  {!suggestionsLoading && suggestions.map((item, idx) => (
                    <button
                      key={item._id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSuggestionClick(item)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 ${activeIndex === idx ? 'bg-accent/50' : 'hover:bg-accent/40'} focus:bg-accent/50 focus:outline-none transition-colors ${idx > 0 ? 'border-t border-border/60' : ''}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground flex items-center gap-2 min-w-0">
                          <span className="truncate max-w-[80%]"><Highlight text={item.fullName} query={filters.keyword} /></span>
                          <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">User</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2">
                          {item.age && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-foreground/80 max-w-[25%] overflow-hidden text-ellipsis whitespace-nowrap">Age: {item.age}</span>
                          )}
                          {item.gender && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-foreground/80 max-w-[35%] overflow-hidden text-ellipsis whitespace-nowrap">Gender: {item.gender}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                    </button>
                  ))}
                </div>, document.body
              )}
            </div>

            {/* Main Action Buttons + Advanced Filters Toggle */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap md:flex md:flex-nowrap gap-2 sm:gap-3 lg:gap-2 items-center w-full md:w-auto lg:w-1/2 sm:justify-evenly md:justify-start lg:justify-between md:ml-3 animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-200">
              <Button
                variant={filters.status === "missing" ? "default" : "outline"}
                size="sm"
                onClick={handleMissingFilter}
                className="flex items-center gap-1 sm:gap-1.5 h-9 px-2 sm:px-3 lg:px-3 rounded-lg transition-all duration-300 hover:scale-105 text-xs sm:text-sm font-medium"
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                Missing
              </Button>
              <Button
                variant={filters.status === "found" ? "default" : "outline"}
                size="sm"
                onClick={handleFoundFilter}
                className="flex items-center gap-1 sm:gap-1.5 h-9 px-2 sm:px-3 lg:px-3 rounded-lg transition-all duration-300 hover:scale-105 text-xs sm:text-sm font-medium"
              >
                <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                Found
              </Button>
              
              {/* Clear All Filters Button (replaces Search button) */}
              <Button 
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={activeFiltersCount === 0}
                className="flex items-center gap-1 sm:gap-1.5 h-9 px-2 sm:px-3 lg:px-3 rounded-lg transition-all duration-300 hover:scale-105 text-xs sm:text-sm font-medium border-2 min-w-[120px] sm:min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-background"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </Button>
              
              {/* Advanced Filters Toggle */}
              <Button 
                variant="outline"
                onClick={toggleAdvancedFilters}
                className="flex items-center gap-1 sm:gap-1.5 h-9 px-2 sm:px-3 lg:px-3 rounded-lg transition-all duration-300 hover:scale-105 border-2 text-xs sm:text-sm font-medium relative min-w-[120px] sm:min-w-[140px]"
              >
                <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">
                  {isAdvancedOpen ? "Hide Filters" : "More Filters"}
                </span>
                <span className="sm:hidden">
                  {isAdvancedOpen ? "Hide" : "More"}
                </span>
                {activeFiltersCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                    {activeFiltersCount}
                  </div>
                )}
                {isAdvancedOpen ? (
                  <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Advanced Filters Section - Optimized Animation */}
          <div className={`overflow-hidden transition-all duration-200 ease-out ${isAdvancedOpen ? 'max-h-[30rem] opacity-100' : 'max-h-0 opacity-0'}`}>
            {/* Subtle Separator */}
            <div className="border-t border-border/30 mx-2 mt-2"></div>

            {/* Location Filters and Date Range */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 pt-4">
            {/* Country Filter */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 justify-center">
                <MapPin className="w-4 h-4" />
                Country
              </Label>
              <Select value={filters.country} onValueChange={(value) => createFilterChangeHandler("country")(value)}>
                <SelectTrigger className="h-10 w-full border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring">
                  <SelectValue placeholder="Select country" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {countries.map((country) => (
                    <SelectItem key={country} value={country} className="text-sm">
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State Filter */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs sm:text-sm font-semibold text-foreground text-center block">State</Label>
              <Select value={filters.state} onValueChange={(value) => createFilterChangeHandler("state")(value)}>
                <SelectTrigger className="h-10 w-full border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring">
                  <SelectValue placeholder="Select state" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all" className="text-sm">All States</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state} value={state} className="text-sm">
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City Filter */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs sm:text-sm font-semibold text-foreground text-center block">City</Label>
              <Select value={filters.city} onValueChange={(value) => createFilterChangeHandler("city")(value)}>
                <SelectTrigger className="h-10 w-full border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring">
                  <SelectValue placeholder="Select city" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all" className="text-sm">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city} className="text-sm">
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender Filter */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs sm:text-sm font-semibold text-foreground text-center block">Gender</Label>
              <Select value={filters.gender || "all"} onValueChange={(value) => createFilterChangeHandler("gender")(value)}>
                <SelectTrigger className="h-10 w-full border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-ring">
                  <SelectValue placeholder="Select gender" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All Genders</SelectItem>
                  <SelectItem value="male" className="text-sm">Male</SelectItem>
                  <SelectItem value="female" className="text-sm">Female</SelectItem>
                  <SelectItem value="other" className="text-sm">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Smart Date Range Picker */}
            <div className="space-y-1.5 min-w-0 col-span-2 sm:col-span-1">
              <Label className="text-xs sm:text-sm font-semibold text-foreground text-center block">Date Range</Label>
              <SmartDateRangePicker
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onDateChange={(dateFrom, dateTo) => {
                  createFilterChangeHandler("dateFrom")(dateFrom)
                  createFilterChangeHandler("dateTo")(dateTo)
                }}
                placeholder="Select date or range"
                className="w-full"
              />
            </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {getActiveFilters().length > 0 && (
            <div className="-mx-1 px-1">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:overflow-visible sm:whitespace-normal">
                <span className="text-sm text-muted-foreground font-medium flex-shrink-0">Active filters:</span>
                {getActiveFilters().map((filter) => (
                  <div
                    key={filter.key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium flex-shrink-0 sm:flex-shrink"
                    title={`${filter.label}: ${filter.value}`}
                  >
                    <span className="max-w-[60vw] sm:max-w-xs md:max-w-none truncate">
                      {filter.label}: {filter.value}
                    </span>
                    <button
                      onClick={() => removeFilter(filter.key)}
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${filter.label}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 