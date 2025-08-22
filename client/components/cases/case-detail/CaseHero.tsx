import { Typography } from "@/components/ui/typography"
import { Button as MovingBorderButton } from "@/components/ui/moving-border"
import { Clock } from "lucide-react"
import { formatCaseStatus } from "@/lib/helpers"
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
  const dateText = data.dateMissingFound ? formatCaseStatus(data.dateMissingFound, data.status) : null

  return (
    <div className="space-y-4">
      {/* Name and Status Row */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <Typography variant="h2" as="h1" className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl xl:text-6xl tracking-tight text-foreground leading-tight">
            {data.fullName ?? 'Unknown person'}
          </Typography>
        </div>
        <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
          {data.status && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
              <div className={`w-2 h-2 rounded-full ${data.status === 'missing' ? 'bg-red-500' : data.status === 'found' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="text-sm font-medium text-foreground/90 capitalize">{STATUS_INFO[data.status]?.label ?? 'Unknown'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Demographics and Location */}
      <div className="space-y-3">
        {/* Age, Gender, and Date */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6">
          {data.age && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-muted/50 border border-border/30 flex-shrink-0">
              <span className="text-sm sm:text-base font-medium text-foreground/80 whitespace-nowrap">{data.age} years</span>
            </div>
          )}
          {data.gender && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-muted/50 border border-border/30 flex-shrink-0">
              <span className="text-sm sm:text-base font-medium text-foreground/80 capitalize whitespace-nowrap">{data.gender}</span>
            </div>
          )}
          {dateText && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-muted/50 border border-border/30 flex-shrink-0">
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
                <span className="font-bold text-yellow-700">₹</span>
                <span
                  className="font-bold ml-1 tabular-nums overflow-hidden text-ellipsis inline-block max-w-[100px] sm:max-w-[140px] text-yellow-700"
                  title={`${typeof data.reward === 'string' ? data.reward.replace('₹', '').replace(/,/g, '') : data.reward}`}
                >
                  {typeof data.reward === 'string' ? data.reward.replace('₹', '').replace(/,/g, '') : data.reward}
                </span>
              </MovingBorderButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
