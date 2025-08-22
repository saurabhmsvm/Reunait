import { MapPin } from "lucide-react"
import { LocationData } from "@/lib/location"
import { Typography } from "@/components/ui/typography"
import { Badge } from "@/components/ui/badge"

interface LocationDisplayProps {
  location: LocationData
}

export function LocationDisplay({ location }: LocationDisplayProps) {
  if (!location || location.city === 'Unknown') {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <MapPin className="h-4 w-4" />
      <Typography variant="small" className="text-muted-foreground">
        Showing cases near {location.city}, {location.state}
      </Typography>
      <Badge variant="secondary" className="text-xs">
        {location.country}
      </Badge>
    </div>
  )
} 