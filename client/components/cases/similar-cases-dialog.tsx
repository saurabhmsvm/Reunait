"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { type Case } from "@/types"
import { CaseCard } from "@/components/cases/case-card"

export type SimilarCasesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cases?: Case[]
  title?: string
  ctaText?: string
  onCtaClick?: () => void
}

export function SimilarCasesDialog({
  open,
  onOpenChange,
  cases = [],
  title = "Similar People Found",
  ctaText = "See all similar",
  onCtaClick
}: SimilarCasesDialogProps) {
  const shouldScroll = (cases?.length ?? 0) > 3

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden flex flex-col md:max-w-screen-lg md:max-h-[85vh]"
      >
        <div className="relative border-b flex-shrink-0">
          <DialogHeader className="px-6 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base md:text-lg font-semibold">
                {title}
              </DialogTitle>
              {onCtaClick && (
                <Button variant="link" className="px-0 h-auto" onClick={onCtaClick}>
                  {ctaText}
                </Button>
              )}
            </div>
          </DialogHeader>
        </div>

        {/* Mobile: native scroll container with hidden scrollbar */}
        <div className="flex-1 min-h-0 md:hidden">
          <div className="max-h-[70dvh] overflow-y-auto px-6 py-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cases.length === 0 ? (
              <div className="text-muted-foreground text-sm">No similar cases to display.</div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {cases.map((caseItem) => (
                  <CaseCard key={caseItem._id} case={caseItem} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop: scroll only when needed */}
        <div className="hidden md:block">
          {shouldScroll ? (
            <ScrollArea className="px-6 py-6 max-h-[75vh]">
              <div className="grid md:grid-cols-3 gap-5">
                {cases.map((caseItem) => (
                  <CaseCard key={caseItem._id} case={caseItem} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="px-6 py-6">
              {cases.length === 0 ? (
                <div className="text-muted-foreground text-sm md:text-base">
                  No similar cases to display.
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-5">
                  {cases.map((caseItem) => (
                    <CaseCard key={caseItem._id} case={caseItem} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
