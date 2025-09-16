"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { getOnboardingStatus } from "@/lib/clerk-metadata"

const sanitizeReturnTo = (val: string | null): string => {
  try {
    const v = (val || "/profile").trim()
    if (!v.startsWith("/")) return "/profile"
    if (v === "/" || v === "/profile" || v.startsWith("/cases")) return v
    return "/profile"
  } catch {
    return "/profile"
  }
}

export default function SsoCompletePage() {
  const router = useRouter()
  const search = useSearchParams()
  const returnTo = sanitizeReturnTo(search?.get("returnTo"))
  const { isLoaded, isSignedIn, sessionClaims, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.replace("/sign-in")
      return
    }

    const run = async () => {
      // Primary: Check Clerk metadata
      const onboarding = getOnboardingStatus(sessionClaims)
      
      if (onboarding === true) {
        // Onboarding complete, go to intended destination
        router.replace(returnTo)
        return
      }
      
      if (onboarding === false) {
        // Onboarding incomplete, go directly to onboarding
        router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
        return
      }
      
      // Fallback: try API if metadata missing
      try {
        const token = await getToken()
        if (token) {
          const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.1.3:3001"
          const res = await fetch(`${base}/api/users/profile`, { 
            headers: { Authorization: `Bearer ${token}` } 
          })
          const data = await res.json().catch(() => null)
          const completed = res.ok && data?.data?.onboardingCompleted === true
          
          if (completed) {
            router.replace(returnTo)
          } else {
            router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
          }
          return
        }
      } catch {}
      
      // Final fallback: assume onboarding needed
      router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
    }
    
    void run()
  }, [isLoaded, isSignedIn, sessionClaims, getToken, router, returnTo])

  // Show loading while determining where to redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    </div>
  )
}
