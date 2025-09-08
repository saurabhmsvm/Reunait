"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { getOnboardingStatus } from "@/lib/clerk-metadata"

export const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { getToken, isSignedIn, isLoaded, sessionClaims } = useAuth()
  const isAuthRoute = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")
  const [fallbackChecked, setFallbackChecked] = React.useState(false)

  const handleRouting = (onboardingCompleted: boolean) => {
    const isOnboardingRoute = pathname?.startsWith("/onboarding")
    
    if (!onboardingCompleted && !isOnboardingRoute) {
      router.replace(`/onboarding?returnTo=${encodeURIComponent(pathname)}`)
    } else if (onboardingCompleted && isOnboardingRoute) {
      router.replace('/profile')
    }
  }

  React.useEffect(() => {
    (async () => {
      if (!isLoaded) return
      if (!isSignedIn) return
      // Even if we're on an auth route, if signed in we should route away based on onboarding
      
      try {
        // Primary: Check Clerk metadata
        const onboardingFromMetadata = getOnboardingStatus(sessionClaims)
        
        if (onboardingFromMetadata !== null) {
          // Metadata exists, use it
          handleRouting(onboardingFromMetadata)
        } else if (!fallbackChecked) {
          // Metadata missing, fallback to API
          setFallbackChecked(true)
          const token = await getToken()
          if (!token) {
            handleRouting(false) // Default to onboarding if no token
            return
          }
          
          const base = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.3:3001"
          const response = await fetch(`${base}/api/users/profile`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await response.json().catch(() => null)
          const onboardingFromAPI = response.ok && data?.data?.onboardingCompleted === true
          
          // Note: We don't sync metadata here as it should be handled by backend
          // The metadata will be set when user completes onboarding
          handleRouting(onboardingFromAPI)
        }
      } catch (error) {
        // If both fail, default to onboarding page
        console.error('OnboardingGate error:', error)
        handleRouting(false)
      }
    })()
  }, [getToken, isLoaded, isSignedIn, pathname, router, isAuthRoute, sessionClaims, fallbackChecked])

  return <>{children}</>
}


