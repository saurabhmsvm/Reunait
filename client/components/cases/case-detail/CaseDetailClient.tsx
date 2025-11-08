"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Flag } from "lucide-react"
import { fetchCaseById, type CaseDetail } from "@/lib/api"
import { useNavigationLoader } from "@/hooks/use-navigation-loader"
import { useNotificationsIngestion } from "@/hooks/use-notifications-ingestion"
import { SimpleLoader } from "@/components/ui/simple-loader"
import { Card, CardContent } from "@/components/ui/card"
import { ReportInfoPopup } from "@/components/cases/report-info-popup"
import { CaseDescription } from "@/components/cases/case-detail/CaseDescription"
import { CaseDetailSection } from "@/components/cases/case-detail/CaseDetailSection"
import { CaseHero } from "@/components/cases/case-detail/CaseHero"
import { CaseActions } from "@/components/cases/case-detail/CaseActions"
import { SimilarCasesDialog } from "@/components/cases/similar-cases-dialog"
import { StatusChangeDialog } from "@/components/cases/case-detail/StatusChangeDialog"
import { FlagCaseDialog } from "@/components/cases/case-detail/FlagCaseDialog"
import { ShareDialog } from "@/components/cases/case-detail/ShareDialog"
import { AssignCaseDialog } from "@/components/cases/case-detail/AssignCaseDialog"
import { useCaseImages } from "@/hooks/cases/useCaseImages"
import { useCaseActions } from "@/hooks/cases/useCaseActions"
import { useImageUrlRefresh } from "@/hooks/useImageUrlRefresh"

type Props = {
  id: string
  initialData?: CaseDetail | null
  initialMeta?: any
  initialNow?: number
}

export function CaseDetailClient({ id, initialData, initialMeta, initialNow }: Props) {
  const { getToken, isSignedIn, userId } = useAuth()
  const router = useRouter()
  const { isLoading: isNavLoading, startLoading, stopLoading } = useNavigationLoader()
  const { handleApiResponse } = useNotificationsIngestion()

  const [data, setData] = useState<CaseDetail | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)

  // Image URL refresh hook with proactive expiration tracking
  const { refreshUrl, getUrl, version } = useImageUrlRefresh()

  const images = useMemo(() => {
    if (!data) return [] as string[]
    const list = Array.isArray(data.imageUrls) && data.imageUrls.length > 0 ? data.imageUrls : []
    
    // Use getUrl to check expiration and get cached valid URLs (industry best practice)
    return list.map((url, idx) => {
      const imageIndex = idx + 1 // 1-based for API
      // getUrl checks expiration and returns cached valid URL or triggers refresh
      return getUrl(id, imageIndex, url)
    })
  }, [data, id, getUrl, version])

  // After a router.refresh (SSR re-run), Next.js will send new props.
  // Sync any updated initialData back into local state so all child components reflect updates.
  useEffect(() => {
    if (initialData) {
      setData(initialData)
      // stop loader when new data is synced
      stopLoading()
    }
  }, [initialData])

  const { selectedIndex, setSelectedIndex } = useCaseImages({ images })

  // Note: Proactive refresh is now handled automatically by useImageUrlRefresh hook
  // URLs are refreshed at 80% of expiration time (2.4 minutes) in the background
  // No need for manual refresh on image switch - hook handles it automatically

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
    isShareModalOpen,
    setIsShareModalOpen,
  } = useCaseActions({ data, initialNow })

  // Use backend canCloseCase to determine if user is case owner
  const isOwner = Boolean(data?.canCloseCase)

  // Function to refresh case data after status change
  // Optimistically update UI to avoid double GET, then soft refresh
  const refreshCaseData = async (patch?: Partial<CaseDetail>) => {
    if (patch) {
      setData((prev) => ({ ...(prev ?? {} as CaseDetail), ...patch }))
    }
    // Revalidate via server action already invoked; do a light refresh to sync server components
    router.refresh()
  }

  // Enhanced success handler that refreshes data
  const handleReportSuccessWithRefresh = async () => {
    handleReportSuccess() // Show success toast
    await refreshCaseData() // Refresh case data
  }


  useEffect(() => {
    if (initialData) {
      // Ingest notifications from SSR meta to avoid duplicate client fetch
      if (initialMeta) {
        handleApiResponse({ _meta: initialMeta })
      }
      return
    }
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const token = await getToken()
        const res = await fetchCaseById(id, token || undefined)
        handleApiResponse(res)
        setData(res.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load case")
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id, getToken, initialData, initialMeta])

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-8">
        {isNavLoading && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <SimpleLoader />
          </div>
        )}
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
      {isNavLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <SimpleLoader />
        </div>
      )}
      <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4">
          {/* Mobile: Two-row layout */}
          <div className="block sm:hidden">
            {/* Breadcrumb row */}
            <div className="text-sm text-muted-foreground mb-4">
              <button 
                onClick={() => {
                  startLoading({ expectRouteChange: true })
                  router.push('/cases')
                }}
                className="text-primary hover:underline cursor-pointer"
              >
                Cases
              </button>
              <span className="mx-2">/</span>
              <span className="text-foreground" title={data.fullName ?? 'Case'}>
                {data.fullName && data.fullName.length > 25 
                  ? `${data.fullName.substring(0, 25)}...` 
                  : (data.fullName ?? 'Case')
                }
              </span>
            </div>
            
            {/* Capsules row */}
            {data.status && (
              data.status === 'closed' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-card/80 backdrop-blur-sm shadow-sm cursor-default opacity-75 w-fit">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-sm font-medium text-foreground/90 capitalize">
                    Closed {data.caseClosingDate ? `on ${new Date(data.caseClosingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 flex-wrap">
                  {/* Flag Case button */}
                  {(() => {
                    const handleUnauthedFlag = () => {
                      // show a global loader during redirect
                      startLoading()
                      router.push(`/sign-in?returnTo=${encodeURIComponent(`/cases/${id}`)}&origin=flag`)
                    }
                    if (!isSignedIn) {
                      return (
                        <button
                          onClick={handleUnauthedFlag}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-white/20 dark:bg-white/10 backdrop-blur-md text-foreground/90 shadow-lg hover:bg-white/30 dark:hover:bg-white/15 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 whitespace-nowrap"
                          aria-label="Flag case (sign in required)"
                          aria-pressed="false"
                        >
                          <Flag className="h-5 w-5 font-bold" />
                        </button>
                      )
                    }
                    // Owner: hide flag capsule entirely
                    if (isOwner) return null
                    // Already flagged by this user: show subtle red fill
                    if (data.canFlag === false) {
                      return (
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-white/20 dark:bg-white/10 backdrop-blur-md shadow-lg cursor-default whitespace-nowrap"
                          aria-disabled
                          aria-label="Already flagged"
                          aria-pressed="true"
                        >
                          <Flag className="h-5 w-5 font-bold text-red-500 dark:text-red-300 fill-red-500 dark:fill-red-300" />
                        </div>
                      )
                    }
                    return (
                      <FlagCaseDialog caseId={id} onFlagged={refreshCaseData}>
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-white/20 dark:bg-white/10 backdrop-blur-md text-foreground/90 shadow-lg hover:bg-white/30 dark:hover:bg-white/15 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 whitespace-nowrap"
                          role="button"
                          aria-label="Flag case"
                          aria-pressed="false"
                        >
                          <Flag className="h-5 w-5 font-bold" />
                        </div>
                      </FlagCaseDialog>
                    )
                  })()}
                  {/* Non-clickable status capsule */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-card/80 backdrop-blur-md shadow-sm cursor-default whitespace-nowrap">
                    <div className={`w-2 h-2 rounded-full ${data.status === 'missing' ? 'bg-red-500' : data.status === 'found' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="text-sm font-medium text-foreground capitalize">
                      {data.status === 'missing' ? 'Missing' : data.status === 'found' ? 'Found' : 'Unknown'}
                    </span>
                  </div>
                  {/* Clickable Close Case capsule (visible only when allowed) */}
                  {data?.canCloseCase ? (
                    <StatusChangeDialog
                      caseId={id}
                      currentStatus={data.status}
                      onStatusChange={refreshCaseData}
                    >
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200/30 dark:border-red-400/20 bg-red-100/30 dark:bg-red-900/20 text-red-700 dark:text-red-300 backdrop-blur-md shadow-lg hover:bg-red-200/40 dark:hover:bg-red-800/30 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 whitespace-nowrap"
                        role="button"
                        aria-label="Close case"
                      >
                        <span className="text-sm font-medium">Close Case</span>
                      </div>
                    </StatusChangeDialog>
                  ) : null}
                </div>
              )
            )}
          </div>

          {/* Desktop: Single-row layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <button 
                onClick={() => {
                  startLoading({ expectRouteChange: true })
                  router.push('/cases')
                }}
                className="text-primary hover:underline cursor-pointer"
              >
                Cases
              </button>
              <span className="mx-2">/</span>
              <span className="text-foreground" title={data.fullName ?? 'Case'}>
                {data.fullName && data.fullName.length > 25 
                  ? `${data.fullName.substring(0, 25)}...` 
                  : (data.fullName ?? 'Case')
                }
              </span>
            </div>
            {data.status && (
              data.status === 'closed' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-card/80 backdrop-blur-sm shadow-sm cursor-default opacity-75">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-sm font-medium text-foreground/90 capitalize">
                    Closed {data.caseClosingDate ? `on ${new Date(data.caseClosingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 xl:gap-4">
                  {/* Flag Case button */}
                  {(() => {
                    const handleUnauthedFlag = () => {
                      startLoading()
                      router.push(`/sign-in?returnTo=${encodeURIComponent(`/cases/${id}`)}&origin=flag`)
                    }
                    if (!isSignedIn) {
                      return (
                        <button
                          onClick={handleUnauthedFlag}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-white/20 dark:bg-white/10 backdrop-blur-md text-foreground/90 shadow-lg hover:bg-white/30 dark:hover:bg-white/15 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 whitespace-nowrap"
                          aria-label="Flag case (sign in required)"
                          aria-pressed="false"
                        >
                          <Flag className="h-5 w-5 font-bold" />
                        </button>
                      )
                    }
                    // Owner: hide flag capsule entirely
                    if (isOwner) return null
                    // Already flagged by this user: show subtle red fill
                    if (data.canFlag === false) {
                      return (
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-white/20 dark:bg-white/10 backdrop-blur-md shadow-lg cursor-default whitespace-nowrap"
                          aria-disabled
                          aria-label="Already flagged"
                          aria-pressed="true"
                        >
                          <Flag className="h-5 w-5 font-bold text-red-500 dark:text-red-300 fill-red-500 dark:fill-red-300" />
                        </div>
                      )
                    }
                    return (
                      <FlagCaseDialog caseId={id} onFlagged={refreshCaseData}>
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-white/20 dark:bg-white/10 backdrop-blur-md text-foreground/90 shadow-lg hover:bg-white/30 dark:hover:bg-white/15 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 whitespace-nowrap"
                          role="button"
                          aria-label="Flag case"
                          aria-pressed="false"
                        >
                          <Flag className="h-5 w-5 font-bold" />
                        </div>
                      </FlagCaseDialog>
                    )
                  })()}
                  {/* Non-clickable status capsule */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border/80 bg-card/80 backdrop-blur-md shadow-sm cursor-default whitespace-nowrap">
                    <div className={`w-2 h-2 rounded-full ${data.status === 'missing' ? 'bg-red-500' : data.status === 'found' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="text-sm font-medium text-foreground capitalize">
                      {data.status === 'missing' ? 'Missing' : data.status === 'found' ? 'Found' : 'Unknown'}
                    </span>
                  </div>
                  {/* Clickable Close Case capsule (visible only when allowed) */}
                  {data?.canCloseCase ? (
                    <StatusChangeDialog
                      caseId={id}
                      currentStatus={data.status}
                      onStatusChange={refreshCaseData}
                    >
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200/30 dark:border-red-400/20 bg-red-100/30 dark:bg-red-900/20 text-red-700 dark:text-red-300 backdrop-blur-md shadow-lg hover:bg-red-200/40 dark:hover:bg-red-800/30 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 whitespace-nowrap"
                        role="button"
                        aria-label="Close case"
                      >
                        <span className="text-sm font-medium">Close Case</span>
                      </div>
                    </StatusChangeDialog>
                  ) : null}
                </div>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 lg:sticky lg:top-6 self-start">
            <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <CardContent className="px-4 py-2">
                {images.length > 0 ? (
                  <>
                    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card">
                      <div className="relative w-full aspect-[4/5] md:max-h-[520px] lg:max-h-none">
                        <Image
                          key={`${id}-${selectedIndex}-${images[selectedIndex]}`}
                          src={images[selectedIndex]}
                          alt={`${data?.fullName ?? 'Person'} - Image ${selectedIndex + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 40vw"
                          priority={selectedIndex === 0}
                          onError={async (e) => {
                            // Fallback error handler - proactive refresh should prevent most errors
                            const imageIndex = selectedIndex + 1
                            try {
                              await refreshUrl(id, imageIndex)
                              // URL will be updated via getUrl on next render
                            } catch (error) {
                              console.error(`Failed to refresh URL for case ${id}, image ${imageIndex}:`, error)
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="h-0.5 w-full bg-gradient-to-r from-primary/25 via-primary/15 to-transparent my-3" />
                    {images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pr-1">
                        {images.map((src, i) => {
                          const imageIndex = i + 1
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                // Proactive refresh is handled automatically by useImageUrlRefresh hook
                                // URLs are refreshed at 80% of expiration time in background
                                setSelectedIndex(i)
                              }}
                              className={`relative h-16 w-14 sm:h-20 sm:w-16 rounded-lg overflow-hidden border ${i === selectedIndex ? 'border-primary' : 'border-border'} shrink-0`}
                              aria-label={`Select image ${i + 1}`}
                            >
                              <Image 
                                src={src} 
                                alt={`Thumb ${i + 1}`} 
                                fill 
                                className="object-cover" 
                                sizes="96px"
                                onError={async (e) => {
                                  // Fallback error handler - proactive refresh should prevent most errors
                                  try {
                                    await refreshUrl(id, imageIndex)
                                    // URL will be updated via getUrl on next render
                                  } catch (error) {
                                    console.error(`Failed to refresh URL for case ${id}, image ${imageIndex}:`, error)
                                  }
                                }}
                              />
                            </button>
                          )
                        })}
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

          <div className="lg:col-span-7 space-y-6">
            <CaseHero data={data} />
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
              notifications={data?.notifications || []}
              isCaseOwner={data?.isCaseOwner}
              canCloseCase={data?.canCloseCase}
              canFlag={data?.canFlag}
              isSignedIn={isSignedIn}
            />
            <CaseDescription data={data} />
            <CaseDetailSection 
              sections={data.sections?.map(section => ({
                ...section,
                items: section.items.map((item: any) => {
                  // Add onClick handler for "Assigned: No" when clickable
                  if (item.label === 'Assigned' && item.isClickable && data?.canAssign && id) {
                    return {
                      ...item,
                      onClick: () => setIsAssignDialogOpen(true)
                    }
                  }
                  return item
                })
              })) ?? []} 
            />
          </div>
        </div>

        <ReportInfoPopup
          isOpen={isReportInfoOpen}
          onClose={handleReportInfoClose}
          caseId={data?._id}
          addedBy={data?.caseOwner}
          onSuccess={handleReportSuccessWithRefresh}
        />

        <SimilarCasesDialog
          open={isSimilarDialogOpen}
          onOpenChange={setIsSimilarDialogOpen}
          cases={similarCases}
          
          ctaText="See all similar"
        />

        <ShareDialog
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          caseData={data}
        />

        {data?.canAssign && id && (
          <AssignCaseDialog 
            caseId={id} 
            onAssigned={refreshCaseData}
            open={isAssignDialogOpen}
            onOpenChange={setIsAssignDialogOpen}
          />
        )}
      </div>
    </div>
  )
}



