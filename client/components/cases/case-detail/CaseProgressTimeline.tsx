import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import { formatDate } from "@/lib/helpers"
import { format } from "date-fns"

interface CaseProgressTimelineProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TIMELINE_DATA = [
  { 
    message: "New lead reported in Bandra West area", 
    time: "2024-01-15T14:30:25.123Z",
    ipAddress: "192.168.1.100"
  },
  { 
    message: "Case status updated to 'Under Investigation'", 
    time: "2024-01-14T10:15:30.456Z",
    ipAddress: "10.0.0.50"
  },
  { 
    message: "Police station contacted for additional details", 
    time: "2024-01-13T16:45:20.789Z",
    ipAddress: null // Simulating missing IP from backend
  },
  { 
    message: "Witness interview scheduled for tomorrow", 
    time: "2024-01-12T09:20:15.321Z",
    ipAddress: "203.0.113.10"
  },
  { 
    message: "Case assigned to Detective Sharma", 
    time: "2024-01-08T11:30:45.654Z",
    ipAddress: "198.51.100.75"
  }
]

export function CaseProgressTimeline({ children, open, onOpenChange }: CaseProgressTimelineProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] sm:max-h-[80vh] backdrop-blur-md bg-background/95 border-border/50 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Case Progress Timeline
          </DialogTitle>
          <DialogDescription>
            Real-time updates and activities for this case. Track the investigation progress and recent developments.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
          {TIMELINE_DATA.map((activity, index) => {
            // Convert UTC to user's local timezone
            const localTime = new Date(activity.time)
            const relativeTime = formatDate(localTime, 'relative')
            const formattedDateTime = format(localTime, "MMM dd, yyyy 'at' h:mm a")
            
            return (
              <div key={index} className="flex items-start gap-3 sm:gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                    index === 0 ? 'bg-primary' : 'bg-primary/60'
                  }`}></div>
                  {index < 4 && (
                    <div className="w-px h-12 bg-border/50 mt-2"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-sm font-bold italic text-foreground leading-relaxed">
                        {activity.message}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {relativeTime}
                    </span>
                  </div>
                  
                  <div className="opacity-100">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/70">
                      {activity.time && (
                        <>
                          <span className="whitespace-nowrap">{formattedDateTime}</span>
                          {activity.ipAddress && (
                            <>
                              <span>•</span>
                              <span className="whitespace-nowrap">IP: {activity.ipAddress}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
