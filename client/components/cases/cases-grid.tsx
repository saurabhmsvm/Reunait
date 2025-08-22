"use client"

import { memo } from "react"
import { CaseCard } from "./case-card"
import { Typography } from "@/components/ui/typography"
import type { Case } from "@/lib/api"

interface CasesGridProps {
  cases: Case[]
  loading?: boolean
  emptyMessage?: string
}

// Optimized loading skeleton
const LoadingSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in-0 duration-300">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="animate-pulse">
        <div className="bg-background rounded-lg h-40 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-background rounded w-3/4"></div>
          <div className="h-3 bg-background rounded w-1/2"></div>
          <div className="h-3 bg-background rounded w-2/3"></div>
        </div>
      </div>
    ))}
  </div>
))

LoadingSkeleton.displayName = "LoadingSkeleton"

// Optimized empty state
const EmptyState = memo(({ message }: { message: string }) => (
  <div className="text-center py-12 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
    <Typography variant="large" className="text-muted-foreground mb-2">
      {message}
    </Typography>
    <Typography variant="muted" className="text-muted-foreground">
      Check back later for new cases or try adjusting your search criteria.
    </Typography>
  </div>
))

EmptyState.displayName = "EmptyState"

export const CasesGrid = memo(({ 
  cases, 
  loading = false,
  emptyMessage = "No cases found"
}: CasesGridProps) => {
  if (loading) {
    return <LoadingSkeleton />
  }

  if (cases.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      {cases.map((caseData, index) => (
        <CaseCard
          key={caseData._id}
          case={caseData}
          index={index}
        />
      ))}
    </div>
  )
})

CasesGrid.displayName = "CasesGrid" 