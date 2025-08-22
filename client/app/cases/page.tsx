"use client"

import { Suspense, lazy } from "react"
import { ClientOnly } from "@/components/client-only"

// Lazy load the CasesSection component
const CasesSection = lazy(() => import("@/components/cases/cases-section").then(module => ({ default: module.CasesSection })))

// Optimized loading fallback
const CasesLoading = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="animate-pulse space-y-6">
      {/* Search bar skeleton */}
      <div className="h-20 bg-background rounded-lg"></div>
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-background rounded-lg h-48 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-background rounded w-3/4"></div>
              <div className="h-3 bg-background rounded w-1/2"></div>
              <div className="h-3 bg-background rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default function CasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-0 -mt-4">
        <ClientOnly>
          <Suspense fallback={<CasesLoading />}>
            <CasesSection />
          </Suspense>
        </ClientOnly>
      </div>
    </div>
  )
} 