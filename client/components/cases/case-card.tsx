"use client"

import { useState, useEffect, memo, useMemo, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, User, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { Typography } from "@/components/ui/typography"
import { formatLocation, formatReward } from "@/lib/cases/case-formatters"
import { useRouter } from "next/navigation"
import { useNavigationLoader } from "@/hooks/use-navigation-loader"
import { createPortal } from "react-dom"
import { SimpleLoader } from "@/components/ui/simple-loader"
import { useImageUrlRefresh } from "@/hooks/useImageUrlRefresh"

// Optimized constants
const CAROUSEL_INTERVAL = 800
const LOADING_BASE_DELAY = 200
const LOADING_STAGGER_DELAY = 25
const SWIPE_THRESHOLD = 50 // Minimum distance for swipe to register

interface CaseCardProps {
  case: {
    _id: string
    fullName: string
    age: string
    gender: "male" | "female" | "other"
    status: "missing" | "found" | "closed"
    city: string
    state: string
    country: string
    dateMissingFound: string
    reward?: number | string
    reportedBy: "general_user" | "police" | "NGO"
    imageUrls?: string[]
  }
  index?: number
  highlightQuery?: string
  muted?: boolean
  showMutedHint?: boolean
}

// Using shadcn's default theming

const STATUS_INFO = {
  missing: { icon: AlertCircle, colorLight: "text-red-700", colorDark: "dark:text-red-400", bg: "bg-red-500/10 dark:bg-red-400/10", ring: "ring-red-500/30" },
  found: { icon: CheckCircle, colorLight: "text-emerald-700", colorDark: "dark:text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-400/10", ring: "ring-emerald-500/30" },
  closed: { icon: Clock, colorLight: "text-slate-600", colorDark: "dark:text-slate-400", bg: "bg-slate-500/10 dark:bg-slate-400/10", ring: "ring-slate-500/30" },
  default: { icon: Clock, colorLight: "text-slate-700", colorDark: "dark:text-slate-300", bg: "bg-slate-500/10 dark:bg-slate-400/10", ring: "ring-slate-500/20" }
} as const

export const CaseCard = memo(({ case: caseData, index = 0, highlightQuery = "", muted = false, showMutedHint = false }: CaseCardProps) => {
  const [imageError, setImageError] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  
  // Refs
  const carouselRef = useRef<HTMLDivElement>(null)
  const isMobile = useRef(false)
  
  // Image URL refresh hook with proactive expiration tracking
  const { refreshUrl, getUrl, version } = useImageUrlRefresh()
  
  // Images - use getUrl to check expiration and get cached valid URLs
  const { availableImages, hasMultipleImages } = useMemo(() => {
    const images = caseData.imageUrls && caseData.imageUrls.length > 0 
      ? caseData.imageUrls 
      : []
    
    // Use getUrl to check expiration and return cached valid URLs (industry best practice)
    const mergedImages = images.map((url, idx) => {
      const imageIndex = idx + 1 // 1-based for API
      // getUrl checks expiration and returns cached valid URL or triggers refresh
      return getUrl(caseData._id, imageIndex, url)
    })
    
    return {
      availableImages: mergedImages,
      hasMultipleImages: mergedImages.length > 1
    }
  }, [caseData.imageUrls, caseData._id, getUrl, version])

  const statusInfo = useMemo(() => {
    const rawDate = caseData.dateMissingFound
    const date = rawDate ? new Date(rawDate) : null
    const hasValidDate = !!(date && !isNaN((date as Date).getTime()))
    const formattedFullDate = hasValidDate ? format(date as Date, "dd MMMM yyyy") : null
    const statusConfig = STATUS_INFO[caseData.status] || STATUS_INFO.default
    
    const statusTexts = {
      missing: formattedFullDate ? `Missing since ${formattedFullDate}` : `Missing`,
      found: formattedFullDate ? `Found on ${formattedFullDate}` : `Found`,
      closed: formattedFullDate ? `Case closed ${formattedFullDate}` : `Case closed`,
      default: formattedFullDate ? `Updated ${formattedFullDate}` : `Updated`
    }
    
    return {
      text: statusTexts[caseData.status] || statusTexts.default,
      icon: statusConfig.icon,
      colorLight: statusConfig.colorLight,
      colorDark: statusConfig.colorDark,
      bg: statusConfig.bg,
      ring: statusConfig.ring,
    }
  }, [caseData.dateMissingFound, caseData.status])

  // Inline highlight helper for case name
  const renderHighlightedName = useCallback(() => {
    const q = (highlightQuery || "").trim()
    if (!q || q.toLowerCase().startsWith('user:')) {
      return caseData.fullName
    }
    const name = caseData.fullName || ""
    const lower = name.toLowerCase()
    const qLower = q.toLowerCase()
    const idx = lower.indexOf(qLower)
    if (idx === -1) return name
    const before = name.slice(0, idx)
    const match = name.slice(idx, idx + q.length)
    const after = name.slice(idx + q.length)
    return (
      <span className="tracking-normal leading-tight">
        {before}
        <mark className="bg-amber-200/60 ring-1 ring-amber-400/30 dark:text-white rounded-[2px] px-0 py-0 m-0 align-baseline">{match}</mark>
        {after}
      </span>
    )
  }, [caseData.fullName, highlightQuery])

  // Reporter chip (text-only) - only for police/NGO
  const showReporterChip = caseData.reportedBy === "police" || caseData.reportedBy === "NGO"
  const reporterLabel = useMemo(() => (caseData.reportedBy ? (caseData.reportedBy as string).toUpperCase() : ""), [caseData.reportedBy])
  const reporterClassName = useMemo(() => {
    if (caseData.reportedBy === "police") return "bg-blue-600/90 text-white"
    if (caseData.reportedBy === "NGO") return "bg-purple-600/90 text-white"
    return ""
  }, [caseData.reportedBy])

  // Card base classes
  const cardClassName = useMemo(() => {
    const base = `group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
      hover:-translate-y-[2px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 !py-0`
    const disabled = muted ? 'opacity-60 grayscale' : ''
    return `${base} ${disabled}`.trim()
  }, [muted])

  // Carousel styles with drag offset
  const carouselStyle = useMemo(() => ({
    transform: `translateX(calc(-${currentImageIndex * (100 / Math.max(availableImages.length, 1))}% + ${dragOffset}px))`,
    width: `${Math.max(availableImages.length, 1) * 100}%`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-in-out'
  }), [currentImageIndex, availableImages.length, dragOffset, isDragging])

  const imageWidthStyle = useMemo(() => ({
    width: `${100 / Math.max(availableImages.length, 1)}%`
  }), [availableImages.length])

  const animationDelay = useMemo(() => ({
    animationDelay: `${index * 50}ms`
  }), [index])

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      isMobile.current = window.innerWidth <= 768 || 'ontouchstart' in window
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Effects
  useEffect(() => {
    // Only auto-rotate on desktop hover, not on mobile
    if (!isHovered || !hasMultipleImages || isMobile.current) {
      setCurrentImageIndex(0)
      return
    }

    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % availableImages.length)
    }, CAROUSEL_INTERVAL)
    
    return () => clearInterval(interval)
  }, [isHovered, hasMultipleImages, availableImages.length])

  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => setIsLoading(false), LOADING_BASE_DELAY + (index * LOADING_STAGGER_DELAY))
    return () => clearTimeout(timer)
  }, [index])

  // Touch/swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return
    setTouchStart(e.targetTouches[0].clientX)
    setTouchEnd(null)
    setIsDragging(true)
    setDragOffset(0)
  }, [hasMultipleImages])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages || touchStart === null) return
    const currentTouch = e.targetTouches[0].clientX
    const diff = currentTouch - touchStart
    // Only update drag offset if it's a significant horizontal movement
    if (Math.abs(diff) > 10) {
      setDragOffset(diff)
    }
  }, [hasMultipleImages, touchStart])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages || touchStart === null) return
    const currentTouch = e.changedTouches[0].clientX
    const diff = currentTouch - touchStart
    
    setIsDragging(false)
    setDragOffset(0)
    
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        // Swipe right - go to previous image
        setCurrentImageIndex(prev => prev === 0 ? availableImages.length - 1 : prev - 1)
      } else {
        // Swipe left - go to next image
        setCurrentImageIndex(prev => prev === availableImages.length - 1 ? 0 : prev + 1)
      }
    }
    
    setTouchStart(null)
    setTouchEnd(null)
  }, [hasMultipleImages, touchStart, availableImages.length])

  // Mouse handlers (desktop only)
  const handleMouseEnter = useCallback(() => {
    if (!isMobile.current) setIsHovered(true)
  }, [])
  
  const handleMouseLeave = useCallback(() => {
    if (!isMobile.current) setIsHovered(false)
  }, [])
  
  // Handle image error with automatic URL refresh (fallback mechanism)
  const handleImageError = useCallback(async (event: React.SyntheticEvent<HTMLImageElement, Event>, imageIndex: number) => {
    // Proactive refresh should prevent most errors, but this handles edge cases
    try {
      // Attempt to refresh the URL
      const newUrl = await refreshUrl(caseData._id, imageIndex)
      
      if (newUrl) {
        // Reset error state - URL will be updated via getUrl on next render
        setImageError(false)
        // Force re-render by updating a dummy state (getUrl will return new URL)
        // The image src will update automatically via the useMemo dependency
      } else {
        // Refresh failed, show error
        setImageError(true)
      }
    } catch (error) {
      console.error(`Failed to refresh URL for case ${caseData._id}, image ${imageIndex}:`, error)
      // Only set error if all retries failed
      setImageError(true)
    }
  }, [caseData._id, refreshUrl])
  
  const handleImageNavigation = useCallback((direction: 'prev' | 'next') => (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndex(prev => direction === 'prev' ? (prev === 0 ? availableImages.length - 1 : prev - 1) : (prev === availableImages.length - 1 ? 0 : prev + 1))
  }, [availableImages.length])
  
  const handleImageSelect = useCallback((i: number) => (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setCurrentImageIndex(i) 
  }, [])

  // Navigation loader integration for consistent UX
  const router = useRouter()
  const { isLoading: navLoading, mounted: loaderMounted, startLoading } = useNavigationLoader()
  const onNavigateToDetail = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startLoading({ expectRouteChange: true })
    router.push(`/cases/${caseData._id}`)
  }, [router, caseData._id, startLoading])

  // Loading skeleton
  if (!isMounted || isLoading) {
    return (
      <div className="animate-pulse">
        <Card className="overflow-hidden rounded-2xl border">
          <div className="h-80 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%]"></div>
          <CardContent className="px-5 py-4 space-y-3">
            <div className="space-y-2">
              <div className="h-6 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-16 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
                <div className="h-4 w-4 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-full"></div>
                <div className="h-4 w-12 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-lg"></div>
              <div className="h-4 w-32 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-lg"></div>
              <div className="h-4 w-40 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isMounted) return null

  const StatusIcon = statusInfo.icon

  return (
    <>
    <Link 
      href={`/cases/${caseData._id}`}
      prefetch={false}
      aria-label={`Open case: ${caseData.fullName}`}
      className="block relative"
      onClick={onNavigateToDetail}
    >
      <Card 
        className={cardClassName}
        style={animationDelay}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      {/* Subtle top accent that adapts to status */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${statusInfo.bg}`} />
      
      {/* Hero Image Section - moved outside CardContent to align with top border */}
      <div className="relative h-80 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
          {muted && showMutedHint && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground text-sm font-semibold shadow-sm ring-1 ring-border/60">
                Under review
              </div>
            </div>
          )}
          {availableImages.length > 0 && !imageError ? (
            <div 
              ref={carouselRef}
              className="relative w-full h-full"
              style={{ touchAction: 'manipulation' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Image Carousel */}
              <div 
                className="flex w-full h-full transition-transform duration-300 ease-in-out"
                style={carouselStyle}
              >
                {availableImages.map((imageUrl, idx) => {
                  const imageIndex = idx + 1 // 1-based index for API
                  return (
                    <div 
                      key={`${caseData._id}-image-${idx}`}
                      className="relative flex-shrink-0 w-full h-full"
                      style={imageWidthStyle}
                    >
                      <Image
                        src={imageUrl}
                        alt={`${caseData.fullName} - Image ${idx + 1}`}
                        fill
                        className="object-cover object-top transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => handleImageError(e, imageIndex)}
                        priority={idx < 2}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    </div>
                  )
                })}
              </div>
              
              {/* Image Indicators - Visual only, no click functionality */}
              {hasMultipleImages && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {availableImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                        idx === currentImageIndex 
                          ? 'bg-white shadow-sm' 
                          : 'bg-white/50'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}

              {/* Reporter chip removed as per design */}

              {/* Reward - compact formatted badge to prevent overflow */}
              {((typeof caseData.reward === "number" && caseData.reward > 0) ||
                (typeof caseData.reward === "string" && caseData.reward.trim() !== "" && caseData.reward.trim() !== "0")) && (
                <div className="absolute bottom-1 left-1 z-10 max-w-[75%]">
                  <Badge 
                    variant="secondary"
                    aria-label={`Reward: ${typeof caseData.reward === 'string' ? caseData.reward : caseData.reward}`}
                    title={typeof caseData.reward === 'string' ? caseData.reward : String(caseData.reward)}
                    className="relative px-2.5 py-1.5 text-xs sm:text-sm leading-none font-semibold bg-amber-400 text-slate-900 dark:bg-amber-300 dark:text-amber-950 rounded-full shadow-sm max-w-full"
                  >
                    <span className="block truncate">
                      {formatReward(caseData.reward)}
                    </span>
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="p-3 rounded-full bg-white/90 shadow-sm">
                <User className="w-8 h-8 text-slate-400" aria-hidden="true" />
              </div>
            </div>
                     )}
         </div>

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        <CardContent className="px-6 -mt-2 pb-5 space-y-2">
         {/* Header */}
         <div className="space-y-2">
           <Typography variant="h3" as="h2" className="font-serif font-semibold text-[1.15rem] sm:text-[1.25rem] leading-tight tracking-tight line-clamp-1">
             {renderHighlightedName()}
           </Typography>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <span className="inline-flex items-center rounded-full bg-accent/60 px-2.5 py-0.5 text-sm font-medium">{caseData.age} yrs</span>
             </div>
             <div className="text-right">
               <span className="inline-flex items-center rounded-full bg-accent/40 px-2.5 py-0.5 text-sm font-medium capitalize text-muted-foreground">{caseData.gender}</span>
             </div>
           </div>
         </div>

         {/* Location */}
         <div className="flex items-center gap-3 text-sm">
           <div className="p-1.5 rounded-lg bg-accent/40">
             <MapPin className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
           </div>
           <span className="truncate font-medium tracking-tight">
             {formatLocation(caseData.city, caseData.state, caseData.country)}
           </span>
         </div>

        {/* Status */}
        <div className="flex items-center gap-3 text-sm">
          <div className={`p-1.5 rounded-lg ${statusInfo.bg}`}>
            <StatusIcon className={`w-4 h-4 ${statusInfo.colorLight} ${statusInfo.colorDark} shrink-0`} aria-hidden="true" />
          </div>
          <div className={`font-semibold ${statusInfo.colorLight} ${statusInfo.colorDark} truncate leading-relaxed`}>
            {statusInfo.text}
          </div>
        </div>
       </CardContent>
      </Card>
    </Link>
    {navLoading && loaderMounted && createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md">
        <SimpleLoader />
      </div>,
      typeof document !== 'undefined' ? document.body : (null as any)
    )}
    </>
   )
 })

CaseCard.displayName = "CaseCard"
