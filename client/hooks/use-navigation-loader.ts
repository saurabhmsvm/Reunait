"use client"

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface UseNavigationLoaderOptions {
  maxTimeout?: number // Only for truly broken states (e.g., 30 seconds)
}

type StartLoadingOptions = { expectRouteChange?: boolean }

export function useNavigationLoader(options: UseNavigationLoaderOptions = {}) {
  const { maxTimeout = 30000 } = options // 30 seconds max - only for broken states
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef1 = useRef<number | null>(null)
  const rafRef2 = useRef<number | null>(null)
  const previousPathnameRef = useRef<string | null>(null)
  const previousSearchParamsRef = useRef<string | null>(null)
  const startPathnameRef = useRef<string | null>(null)
  const startSearchParamsRef = useRef<string | null>(null)
  const isLoadingRef = useRef<boolean>(false)

  useEffect(() => {
    setMounted(true)
    // Initialize with current values
    previousPathnameRef.current = pathname
    previousSearchParamsRef.current = searchParams.toString()
  }, [])

  // Utility to clear all timers/raf and stop loading
  const clearAll = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (rafRef1.current) {
      cancelAnimationFrame(rafRef1.current)
      rafRef1.current = null
    }
    if (rafRef2.current) {
      cancelAnimationFrame(rafRef2.current)
      rafRef2.current = null
    }
    isLoadingRef.current = false
    setIsLoading(false)
  }

  // Track pathname changes to detect navigation completion
  useEffect(() => {
    if (isLoadingRef.current && previousPathnameRef.current !== pathname) {
      // Navigation completed - clear loader immediately
      clearAll()
    }
    previousPathnameRef.current = pathname
  }, [pathname])

  // Track search params changes as well
  useEffect(() => {
    if (isLoadingRef.current && previousSearchParamsRef.current !== searchParams.toString()) {
      // Navigation completed - clear loader immediately
      clearAll()
    }
    previousSearchParamsRef.current = searchParams.toString()
  }, [searchParams])

  const startLoading = (opts: StartLoadingOptions = {}) => {
    const { expectRouteChange = true } = opts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    isLoadingRef.current = true
    setIsLoading(true)
    // Capture starting route state to detect non-navigation clicks (same route)
    startPathnameRef.current = pathname
    startSearchParamsRef.current = searchParams.toString()
    
    // Only set a very long timeout as a last resort for truly broken states
    // This should rarely trigger - only if navigation completely fails
    timeoutRef.current = setTimeout(() => {
      console.warn('Navigation loader timeout reached - this indicates a potential navigation issue')
      clearAll()
    }, maxTimeout)

    // Only apply the next-frame fallback when we do NOT expect a route change
    if (!expectRouteChange && typeof window !== 'undefined') {
      if (rafRef1.current) cancelAnimationFrame(rafRef1.current)
      if (rafRef2.current) cancelAnimationFrame(rafRef2.current)
      rafRef1.current = requestAnimationFrame(() => {
        rafRef2.current = requestAnimationFrame(() => {
          const samePath = startPathnameRef.current === pathname
          const sameSearch = startSearchParamsRef.current === searchParams.toString()
          if (samePath && sameSearch) {
            clearAll()
          }
        })
      })
    }
  }

  const stopLoading = () => {
    clearAll()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll()
    }
  }, [])

  return {
    isLoading,
    mounted,
    startLoading,
    stopLoading
  }
}
