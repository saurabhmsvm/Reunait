import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GradientButton } from "@/components/ui/gradient-button"
import { Share2, Megaphone, Activity, Brain, Loader, Lock, Users } from "lucide-react"
import { CaseProgressTimeline } from "./CaseProgressTimeline"
import { FloatingDock } from "@/components/ui/floating-dock"
import { useState } from "react"

interface CaseActionsProps {
  onAiSearch: () => void
  onReportInfo: () => void
  onShare: () => void
  isAiSearchLoading?: boolean
  aiSearchRemainingTime?: number
  isAiSearchEnabled?: boolean
  remainingTimeFormatted?: string
  hasSimilarResults?: boolean
  onOpenSimilar?: () => void
}

export function CaseActions({ 
  onAiSearch, 
  onReportInfo, 
  onShare, 
  isAiSearchLoading = false,
  aiSearchRemainingTime = 0,
  isAiSearchEnabled = true,
  remainingTimeFormatted = '',
  hasSimilarResults = false,
  onOpenSimilar,
}: CaseActionsProps) {
  
  const [isProgressOpen, setIsProgressOpen] = useState(false)

  const formatRemainingTime = (ms: number): string => {
    if (ms <= 0) return "Available"
    
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!hasSimilarResults) {
    return (
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 pb-6">
        <GradientButton 
          onClick={onAiSearch}
          disabled={!isAiSearchEnabled}
          className={`min-w-[120px] sm:min-w-[140px] h-10 px-3 sm:px-4 text-sm ${
            !isAiSearchEnabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {isAiSearchLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : !isAiSearchEnabled ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            <span>
              {isAiSearchLoading 
                ? "Searching..." 
                : !isAiSearchEnabled 
                  ? `Available in ${formatRemainingTime(aiSearchRemainingTime)}`
                  : "AI Search"
              }
            </span>
          </div>
        </GradientButton>

        <Button
          variant="outline"
          onClick={onReportInfo}
          className="gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-border/50 hover:bg-muted/50 font-semibold text-xs sm:text-sm min-w-[100px] sm:min-w-[120px] justify-center cursor-pointer"
          aria-label="Report information"
        >
          <Megaphone className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Report Info</span>
          <span className="sm:hidden">Report</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={onShare}
          className="gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-border/50 hover:bg-muted/50 font-semibold text-xs sm:text-sm min-w-[90px] sm:min-w-[100px] justify-center cursor-pointer"
          aria-label="Share this case"
        >
          <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
          Share
        </Button>
        
        <CaseProgressTimeline>
          <Button 
            variant="outline" 
            className="gap-2 px-4 sm:px-5 py-2.5 sm:py-3 border-border/50 hover:bg-muted/50 font-semibold text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] justify-center cursor-pointer"
          >
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Track Progress</span>
            <span className="sm:hidden">Progress</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              5
            </Badge>
          </Button>
        </CaseProgressTimeline>
      </div>
    )
  }

  const dockItems = [
    {
      title: "Report Info",
      icon: <Megaphone className="w-5 h-5" />,
      onClick: onReportInfo,
    },
    {
      title: "Share",
      icon: <Share2 className="w-5 h-5" />,
      onClick: onShare,
    },
    {
      title: "Progress",
      icon: <Activity className="w-5 h-5" />,
      onClick: () => setIsProgressOpen(true),
    },
  ]

  return (
    <div className="w-full pb-6">
      {/* Desktop / Tablet layout */}
      <div className="hidden md:flex items-center gap-2">
        <GradientButton 
          onClick={onAiSearch}
          disabled={!isAiSearchEnabled}
          className={`min-w-[140px] h-10 px-4 text-sm ${
            !isAiSearchEnabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {isAiSearchLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : !isAiSearchEnabled ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            <span>
              {isAiSearchLoading 
                ? "Searching..." 
                : !isAiSearchEnabled 
                  ? `Available in ${formatRemainingTime(aiSearchRemainingTime)}`
                  : "AI Search"
              }
            </span>
          </div>
        </GradientButton>

        <Button
          variant="outline"
          onClick={onOpenSimilar}
          className="gap-2 px-5 py-2.5 border-border/50 hover:bg-muted/50 font-semibold text-sm min-w-[140px] whitespace-nowrap justify-center cursor-pointer"
          aria-label="View similar people"
        >
          <Users className="w-4 h-4" />
          View Similar People
        </Button>

        <FloatingDock items={dockItems} />
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col gap-2 md:hidden">
        {/* Row 1: AI Search + View Similar People */}
        <div className="flex items-center gap-2">
          <GradientButton 
            onClick={onAiSearch}
            disabled={!isAiSearchEnabled}
            className={`min-w-[120px] h-10 px-3 text-sm ${
              !isAiSearchEnabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isAiSearchLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : !isAiSearchEnabled ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span>
                {isAiSearchLoading 
                  ? "Searching..." 
                  : !isAiSearchEnabled 
                    ? `Available in ${formatRemainingTime(aiSearchRemainingTime)}`
                    : "AI Search"
                }
              </span>
            </div>
          </GradientButton>

          <Button
            variant="outline"
            onClick={onOpenSimilar}
            className="gap-2 px-3 py-2.5 border-border/50 hover:bg-muted/50 font-semibold text-xs min-w-[120px] whitespace-nowrap justify-center cursor-pointer"
            aria-label="View similar people"
          >
            <Users className="w-4 h-4" />
            View Similar People
          </Button>
        </div>

        {/* Row 2: icon-only actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            variant="outline"
            onClick={onReportInfo}
            className="h-10 w-10 p-0 border-border/50 hover:bg-muted/50 justify-center"
            aria-label="Report information"
          >
            <Megaphone className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            onClick={onShare}
            className="h-10 w-10 p-0 border-border/50 hover:bg-muted/50 justify-center"
            aria-label="Share this case"
          >
            <Share2 className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsProgressOpen(true)}
            className="h-10 w-10 p-0 border-border/50 hover:bg-muted/50 justify-center"
            aria-label="Progress"
          >
            <Activity className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <CaseProgressTimeline open={isProgressOpen} onOpenChange={setIsProgressOpen} />
    </div>
  )
}
