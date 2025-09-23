"use client"

import React, { useState, useEffect } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { SimpleLoader } from "@/components/ui/simple-loader"
import { createPortal } from "react-dom"

export const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state while authentication is being determined
  // This prevents any flicker by not rendering content until auth state is clear
  if (!isLoaded || !userLoaded) {
    return (
      <>
        {/* Full Screen Loader with Background Blur (Portal to body) */}
        {mounted && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
            <SimpleLoader />
          </div>,
          document.body
        )}
        {/* Render children with opacity 0 to maintain layout */}
        <div className="opacity-0">
          {children}
        </div>
      </>
    )
  }

  // If not signed in, render children (middleware will handle redirects)
  if (!isSignedIn) {
    return <>{children}</>
  }

  // If signed in, render children (middleware will handle onboarding redirects)
  return <>{children}</>
}


