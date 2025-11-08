import { Typography } from "@/components/ui/typography"
import { Button as MovingBorderButton } from "@/components/ui/moving-border"
import { Clock } from "lucide-react"
import { formatCaseStatus } from "@/lib/helpers"
import { formatReward } from "@/lib/cases/case-formatters"
import type { CaseDetail } from "@/lib/api"

interface CaseHeroProps {
  data: CaseDetail
}

const STATUS_INFO = {
  missing: { label: "Missing" },
  found: { label: "Found" },
  closed: { label: "Closed" },
} as const

export function CaseHero({ data }: CaseHeroProps) {
  const dateText = data.dateMissingFound ? formatCaseStatus(data.dateMissingFound, data.status, data.originalStatus) : null
  
  // Dynamic typography based on name length (max 120 characters)
  const getTypographyClass = (name: string) => {
    const length = name.length
    
    if (length <= 25) {
      // Short names: Bold and large for impact
      return "font-serif font-bold text-3xl sm:text-4xl lg:text-5xl xl:text-6xl tracking-tight"
    } else if (length <= 45) {
      // Medium names: Semibold and medium size
      return "font-serif font-semibold text-2xl sm:text-3xl lg:text-4xl xl:text-5xl tracking-tight"
    } else if (length <= 70) {
      // Long names: Medium weight and smaller size
      return "font-serif font-medium text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight"
    } else {
      // Very long names (71-120): Light weight and smallest size
      return "font-serif font-normal text-lg sm:text-xl lg:text-2xl xl:text-3xl tracking-tight"
    }
  }

  return (
    <div className="space-y-4">
      {/* Name Row */}
      <div className="flex-1 min-w-0">
        <Typography variant="h2" as="h1" className={`${getTypographyClass(data.fullName ?? 'Unknown person')} text-foreground leading-tight break-words`}>
          {data.fullName ?? 'Unknown person'}
        </Typography>
      </div>

      {/* Demographics and Location */}
      <div className="space-y-3">
        {/* Age, Gender, and Date */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6">
          {data.age && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-muted/50 border border-border dark:border-border/80 flex-shrink-0">
              <span className="text-sm sm:text-base font-medium text-foreground/80 whitespace-nowrap">{data.age} years</span>
            </div>
          )}
          {data.gender && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-muted/50 border border-border dark:border-border/80 flex-shrink-0">
              <span className="text-sm sm:text-base font-medium text-foreground/80 capitalize whitespace-nowrap">{data.gender}</span>
            </div>
          )}
          {dateText && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-muted/50 border border-border dark:border-border/80 flex-shrink-0">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-primary/70 flex-shrink-0" />
              <span className="text-sm sm:text-base font-medium text-foreground/80 whitespace-nowrap">{dateText}</span>
            </div>
          )}
          {(typeof data.reward === 'number' ? data.reward > 0 : (typeof data.reward === 'string' && data.reward.trim() !== '')) && (
            <div className="flex-shrink-0">
              <MovingBorderButton 
                duration={2200}
                borderRadius="0.5rem"
                containerClassName="h-8 sm:h-10 min-w-[100px] sm:min-w-[120px] w-auto"
                borderClassName="bg-[radial-gradient(rgba(59,130,246,0.9)_40%,rgba(59,130,246,0)_60%)] brightness-125 mix-blend-screen dark:bg-[radial-gradient(rgba(245,197,24,0.9)_40%,rgba(245,197,24,0)_60%)] dark:mix-blend-screen"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-secondary text-secondary-foreground border border-border font-semibold tracking-wide shadow-sm max-w-[180px] sm:max-w-[220px] whitespace-nowrap text-xs sm:text-sm"
              >
                <span className="font-bold mr-1 text-yellow-700">Reward</span>
                <span
                  className="font-bold tabular-nums overflow-hidden text-ellipsis inline-block max-w-[100px] sm:max-w-[140px] text-yellow-700"
                  title={typeof data.reward === 'string' ? data.reward : data.reward?.toString()}
                >
                  {formatReward(data.reward)}
                </span>
              </MovingBorderButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
