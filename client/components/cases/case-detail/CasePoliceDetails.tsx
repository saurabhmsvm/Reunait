import { Card, CardContent } from "@/components/ui/card"
import type { CaseDetail } from "@/lib/api"

interface CasePoliceDetailsProps {
  data: CaseDetail
}

export function CasePoliceDetails({ data }: CasePoliceDetailsProps) {
  // Only render if there's police-related data
  if (!data.FIRNumber && !data.policeStationName && !data.policeStationCity && !data.policeStationState) {
    return null
  }

  return (
    <Card className="border border-border bg-card shadow-sm rounded-xl">
      <CardContent className="pt-0 pb-0 px-5 space-y-4">
        <div className="text-lg uppercase tracking-widest text-foreground font-extrabold pt-0 pb-2">Police case details</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {data.FIRNumber && (
            <div className="space-y-1.5">
              <div className="font-semibold">FIR Number</div>
              <div className="text-muted-foreground">{data.FIRNumber}</div>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="font-semibold">Case Filed Date</div>
            <div className="text-muted-foreground">January 8, 2025</div>
          </div>
          {data.policeStationName && (
            <div className="space-y-1.5">
              <div className="font-semibold">Police Station Name</div>
              <div className="text-muted-foreground">{data.policeStationName}</div>
            </div>
          )}
          {data.policeStationCity && (
            <div className="space-y-1.5">
              <div className="font-semibold">Police Station City</div>
              <div className="text-muted-foreground">{data.policeStationCity}</div>
            </div>
          )}
          {data.policeStationState && (
            <div className="space-y-1.5">
              <div className="font-semibold">Police Station State</div>
              <div className="text-muted-foreground">{data.policeStationState}</div>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="font-semibold">Police Station Country</div>
            <div className="text-muted-foreground">India</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
