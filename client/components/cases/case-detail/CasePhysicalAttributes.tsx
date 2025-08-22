import { Card, CardContent } from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import type { CaseDetail } from "@/lib/api"

interface CasePhysicalAttributesProps {
  data: CaseDetail
}

export function CasePhysicalAttributes({ data }: CasePhysicalAttributesProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <Typography variant="h3" className="mb-4 sm:mb-6 text-lg sm:text-xl font-semibold">
          Physical Attributes
        </Typography>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <div className="font-semibold">Age</div>
            <div className="text-muted-foreground">{data.age} years</div>
          </div>
          <div className="space-y-1.5">
            <div className="font-semibold">Gender</div>
            <div className="text-muted-foreground capitalize">{data.gender}</div>
          </div>
          {data.height && (
            <div className="space-y-1.5">
              <div className="font-semibold">Height</div>
              <div className="text-muted-foreground">{data.height}</div>
            </div>
          )}
          {data.complexion && (
            <div className="space-y-1.5">
              <div className="font-semibold">Complexion</div>
              <div className="text-muted-foreground capitalize">{data.complexion}</div>
            </div>
          )}
          {data.identificationMark && (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <div className="font-semibold">Identification Mark</div>
              <div className="text-muted-foreground">{data.identificationMark}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

