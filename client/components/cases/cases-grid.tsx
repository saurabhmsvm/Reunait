"use client"

import { memo } from "react"
import { CaseCard } from "./case-card"
import { Typography } from "@/components/ui/typography"
import type { Case } from "@/lib/api"

interface CasesGridProps {
  cases: Case[]
  loading?: boolean
  emptyMessage?: string
  highlightQuery?: string
}

// Optimized loading skeleton - matches actual case card dimensions
const LoadingSkeleton = memo(() => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in-0 duration-300">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="overflow-hidden rounded-2xl border">
        {/* Image section - matches h-80 from actual case card */}
        <div className="h-80 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%]"></div>
        
        {/* Content section - matches actual case card content */}
        <div className="px-6 -mt-2 pb-5 space-y-2">
          {/* Header section */}
          <div className="space-y-2">
            <div className="h-6 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded w-3/4"></div>
            <div className="flex items-center justify-between">
              <div className="h-6 w-16 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-full"></div>
              <div className="h-6 w-20 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-full"></div>
            </div>
          </div>
          
          {/* Location section */}
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-lg"></div>
            <div className="h-4 w-32 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
          </div>
          
          {/* Status section */}
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded-lg"></div>
            <div className="h-4 w-40 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
))

LoadingSkeleton.displayName = "LoadingSkeleton"

// Optimized empty state
const EmptyState = memo(({ message }: { message: string }) => (
  <div className="text-center py-12 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
    <Typography variant="large" className="text-muted-foreground">
      {message}
    </Typography>
  </div>
))

EmptyState.displayName = "EmptyState"

export const CasesGrid = memo(({ 
  cases, 
  loading = false,
  emptyMessage = "No cases found",
  highlightQuery = ""
}: CasesGridProps) => {
  if (loading) {
    return <LoadingSkeleton />
  }

  if (cases.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      {cases.map((caseData, index) => (
        <CaseCard
          key={caseData._id}
          case={caseData}
          index={index}
          highlightQuery={highlightQuery}
        />
      ))}
    </div>
  )
})

CasesGrid.displayName = "CasesGrid" 