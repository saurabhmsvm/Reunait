"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

export const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const isAuthRoute = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")

  React.useEffect(() => {
    (async () => {
      if (!isLoaded) return
      if (!isSignedIn) return
      if (isAuthRoute) return
      try {
        const token = await getToken()
        if (!token) return
        const base = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.3:3001"

        // Fetch onboarding status only
        const profRes = await fetch(`${base}/api/users/profile`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })
        const prof = await profRes.json().catch(() => null)
        const onboardingCompleted = profRes.ok && prof?.data?.onboardingCompleted === true
        const notFound = profRes.status === 404
        const isOnboardingRoute = pathname?.startsWith("/onboarding")
        if ((!onboardingCompleted || notFound) && !isOnboardingRoute) {
          router.replace(`/onboarding?returnTo=${encodeURIComponent("/profile")}`)
          return
        }
        if (onboardingCompleted && isOnboardingRoute) {
          router.replace('/profile')
        }
      } catch (_) {
        // ignore
      }
    })()
  }, [getToken, isLoaded, isSignedIn, pathname, router, isAuthRoute])

  return <>{children}</>
}


