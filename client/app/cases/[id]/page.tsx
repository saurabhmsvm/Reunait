"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { fetchCaseById, type CaseDetail } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Typography } from "@/components/ui/typography"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatDate, formatCaseStatus } from "@/lib/helpers"
import { format } from "date-fns"
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { ReportInfoPopup } from "@/components/cases/report-info-popup"
import { GradientButton } from "@/components/ui/gradient-button"

import { useCaseImages } from "@/hooks/cases/useCaseImages"
import { useCaseActions } from "@/hooks/cases/useCaseActions"
import { CaseDescription } from "@/components/cases/case-detail/CaseDescription"
import { CaseDetailSection } from "@/components/cases/case-detail/CaseDetailSection"
import { CaseHero } from "@/components/cases/case-detail/CaseHero"
import { CaseActions } from "@/components/cases/case-detail/CaseActions"
import { CaseProgressTimeline } from "@/components/cases/case-detail/CaseProgressTimeline"
import { SimilarCasesDialog } from "@/components/cases/similar-cases-dialog"





export default function CaseDetailPage() {
  const params = useParams<{ id: string }>()
  const { getToken } = useAuth()

  const [data, setData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  // Custom hooks for state management
  const images = useMemo(() => {
    if (!data) return [] as string[]
    const list = Array.isArray(data.imageUrls) && data.imageUrls.length > 0 ? data.imageUrls : []
    return list
  }, [data])

  const {
    selectedIndex,
    setSelectedIndex
  } = useCaseImages({ images })

  const {
    isReportInfoOpen,
    isAiSearchLoading,
    aiSearchRemainingTime,
    isAiSearchEnabled,
    remainingTimeFormatted,
    handleShare,
    handleAiSearch,
    handleReportInfo,
    handleReportInfoClose,
    handleReportSuccess,
    similarCases,
    hasSimilarResults,
    isSimilarDialogOpen,
    setIsSimilarDialogOpen,
    openSimilarDialog,
  } = useCaseActions({ data })



  // Fetch by id
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const token = await getToken()
        const res = await fetchCaseById(params.id, token || undefined)
        setData(res.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load case")
      } finally {
        setLoading(false)
      }
    }
    if (params.id) load()
  }, [params.id, getToken])





  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-8">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-[460px] bg-muted rounded-xl" />
          <div className="lg:col-span-7 space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-5 bg-muted rounded w-1/2" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-12 text-center">
        <p className="text-destructive">{error ?? "Case not found"}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/cases" className="text-primary hover:underline">Cases</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{data.fullName ?? 'Case'}</span>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Vertical Images */}
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 lg:sticky lg:top-6 self-start">
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <CardContent className="px-4 py-2">
              {images.length > 0 ? (
                <>
                  <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card">
                    <div className="relative w-full aspect-[4/5] md:max-h-[520px] lg:max-h-none">
                      <Image
                        src={images[selectedIndex]}
                        alt={`${data?.fullName ?? 'Person'} - Image ${selectedIndex + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        priority
                      />
                    </div>
                  </div>
                  
                  <div className="h-0.5 w-full bg-gradient-to-r from-primary/25 via-primary/15 to-transparent my-3" />
                  
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pr-1">
                      {images.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedIndex(i)}
                          className={`relative h-16 w-14 sm:h-20 sm:w-16 rounded-lg overflow-hidden border ${i === selectedIndex ? 'border-primary' : 'border-border'} shrink-0`}
                          aria-label={`Select image ${i + 1}`}
                        >
                          <Image src={src} alt={`Thumb ${i + 1}`} fill className="object-cover" sizes="96px" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-[520px] flex items-center justify-center">
                  <div className="p-3 rounded-full border border-border bg-card">
                    <div className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Section */}
          <CaseHero data={data} />

          {/* Action Buttons */}
          <CaseActions 
            onAiSearch={handleAiSearch}
            onReportInfo={handleReportInfo}
            onShare={handleShare}
            isAiSearchLoading={isAiSearchLoading}
            aiSearchRemainingTime={aiSearchRemainingTime}
            isAiSearchEnabled={isAiSearchEnabled}
            remainingTimeFormatted={remainingTimeFormatted}
            hasSimilarResults={hasSimilarResults}
            onOpenSimilar={openSimilarDialog}
          />

          {/* Description */}
          <CaseDescription data={data} />

          <CaseDetailSection sections={data.sections ?? []} />
        </div>
        </div>



        {/* Report Info Popup */}
        <ReportInfoPopup
          isOpen={isReportInfoOpen}
          onClose={handleReportInfoClose}
          caseId={data?._id}
          onSuccess={handleReportSuccess}
        />
        
        {/* Similar Cases Dialog */}
        <SimilarCasesDialog
          open={isSimilarDialogOpen}
          onOpenChange={setIsSimilarDialogOpen}
          cases={similarCases}
          title="Similar People Found"
          ctaText="See all similar"
        />

      </div>
    </div>
  )
}


