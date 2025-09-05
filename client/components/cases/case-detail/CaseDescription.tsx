import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone } from "lucide-react"
import type { CaseDetail } from "@/lib/api"
import { formatLocation } from "@/lib/cases/case-formatters"

interface CaseDescriptionProps {
  data: CaseDetail
}

export function CaseDescription({ data }: CaseDescriptionProps) {
  return (
    <Card className="border border-border bg-card shadow-sm rounded-xl">
      <CardContent className="pt-0 pb-0 px-5 space-y-2">
        <div className="flex items-center gap-3">
          <div className="text-lg uppercase tracking-widest text-foreground font-extrabold">Description</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-200">
            <div className="relative">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-primary/70 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-semibold text-primary tracking-wide">AI Generated</span>
          </div>
        </div>
        
        {data.description && (
          <div className="text-sm pb-3">
            <p className="text-muted-foreground text-sm font-serif italic">{data.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
          {(data.city || data.state || data.country) && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg border border-border/50 bg-card/50 shadow-sm">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold mb-0.5">Location</div>
                <div className="text-muted-foreground truncate" title={[data.city, data.state, data.country].filter(Boolean).join(', ')}>
                  {formatLocation(data.city, data.state, data.country)}
                </div>
              </div>
            </div>
          )}

          {data.contactNumber && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg border border-border/50 bg-card/50 shadow-sm">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold mb-0.5">Contact</div>
                <a href={`tel:${data.contactNumber}`} className="text-primary hover:underline">
                  {data.contactNumber}
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
