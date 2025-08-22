"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Search, User, Shield, Calendar, MapPin, ChevronDown, ChevronUp, Filter } from "lucide-react"
import { CountriesStatesService } from "@/lib/countries-states"
import { LocationService } from "@/lib/location"

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

export function CasesSearch({ onSearch, onClear, loading = false }: CasesSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS)
  const [countries, setCountries] = useState<string[]>([])
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  // Memoized active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.country !== "India") count++
    if (filters.state !== "all") count++
    if (filters.city !== "all") count++
    if (filters.gender && filters.gender !== "all") count++
    if (filters.dateFrom instanceof Date) count++
    if (filters.dateTo instanceof Date) count++
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

  // Initialize data and location
  useEffect(() => {
    const initializeData = () => {
      // Initialize countries and states
      const allCountries = CountriesStatesService.getCountries()
      const defaultStates = CountriesStatesService.getStates("India")
      const defaultCities = CountriesStatesService.getCities("India", "Bihar")
      
      setCountries(allCountries)
      setStates(defaultStates)
      setCities(defaultCities)

      // Load saved location
      const savedLocation = LocationService.getSavedLocation()
      const defaults = LocationService.getFilterDefaults()
      
      setFilters(prev => ({
        ...prev,
        country: savedLocation?.country || defaults.country,
        state: "all",
        city: "all"
      }))
    }

    initializeData()
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

  const toggleAdvancedFilters = useCallback(() => {
    setIsAdvancedOpen(prev => !prev)
  }, [])

  return (
    <Card className="border border-border bg-card/90 backdrop-blur-md animate-in fade-in-0 slide-in-from-top-2 duration-500">
      <CardContent className="pt-0 -mb-4 px-4">
        <div className="space-y-4">
          {/* Search Bar and Quick Actions */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center">
            {/* Compact Search Input */}
            <div className="relative w-full lg:w-1/2 animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-100">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Name, mobile, or FIR number..."
                value={filters.keyword}
                onChange={(e) => createFilterChangeHandler("keyword")(e.target.value)}
                className="pl-10 h-9 text-sm border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg"
              />
            </div>

            {/* Main Action Buttons + Advanced Filters Toggle */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 lg:gap-2 items-center w-full lg:w-1/2 sm:justify-evenly lg:justify-between animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-200">
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
              <Button 
                onClick={handleSearch} 
                disabled={loading}
                className="flex items-center gap-1 sm:gap-1.5 h-9 px-2 sm:px-3 lg:px-3 rounded-lg transition-all duration-300 hover:scale-105 shadow-md bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 text-xs sm:text-sm font-semibold min-w-[120px] sm:min-w-[140px]"
              >
                <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{loading ? "Searching..." : "Search Cases"}</span>
                <span className="sm:hidden">{loading ? "Searching..." : "Search"}</span>
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
          <div className={`overflow-hidden transition-all duration-200 ease-out ${isAdvancedOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            {/* Subtle Separator */}
            <div className="border-t border-border/30 mx-2 mt-2"></div>

            {/* Location Filters and Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pt-4">
            {/* Country Filter */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5 justify-center">
                <MapPin className="w-4 h-4" />
                Country
              </Label>
              <Select value={filters.country} onValueChange={(value) => createFilterChangeHandler("country")(value)}>
                <SelectTrigger className="h-9 w-full border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm">
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
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground text-center block">State</Label>
              <Select value={filters.state} onValueChange={(value) => createFilterChangeHandler("state")(value)}>
                <SelectTrigger className="h-9 w-full border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm">
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
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground text-center block">City</Label>
              <Select value={filters.city} onValueChange={(value) => createFilterChangeHandler("city")(value)}>
                <SelectTrigger className="h-9 w-full border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm">
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
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground text-center block">Gender</Label>
              <Select value={filters.gender || "all"} onValueChange={(value) => createFilterChangeHandler("gender")(value)}>
                <SelectTrigger className="h-9 w-full border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm">
                  <SelectValue placeholder="Select gender" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All Genders</SelectItem>
                  <SelectItem value="male" className="text-sm">Male</SelectItem>
                  <SelectItem value="female" className="text-sm">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground text-center block">Date From</Label>
              <DatePicker
                date={filters.dateFrom}
                onDateChange={(date) => createFilterChangeHandler("dateFrom")(date)}
                placeholder="Select start date"
                className="w-full"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground text-center block">Date To</Label>
              <DatePicker
                date={filters.dateTo}
                onDateChange={(date) => createFilterChangeHandler("dateTo")(date)}
                placeholder="Select end date"
                className="w-full"
              />
            </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 