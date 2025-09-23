/**
 * LocationPermissionBanner - Component to request location permission
 * Provides a user-friendly way to request location access
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, X, AlertCircle } from 'lucide-react'
import { useLocationContext } from '@/contexts/location-context'

interface LocationPermissionBannerProps {
  onDismiss?: () => void
  className?: string
}

export function LocationPermissionBanner({ onDismiss, className = '' }: LocationPermissionBannerProps) {
  const { requestLocation, loading, error, isSupported, location, hasPermission } = useLocationContext()
  const [isDismissed, setIsDismissed] = useState(false)

  const handleRequestLocation = async () => {
    try {
      await requestLocation()
    } catch (error) {
      console.error('Failed to request location:', error)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  // Don't show if geolocation is not supported
  if (!isSupported) {
    return null
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null
  }

  // Don't show if we already have location data
  if (location) {
    return null
  }

  // Don't show if user has denied permission
  if (error?.type === 'permission') {
    return null
  }

  // Don't show if we're currently loading
  if (loading) {
    return null
  }

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground mb-1">
              Show cases near you
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Allow location access to automatically filter cases by your area for more relevant results.
            </p>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleRequestLocation}
                disabled={loading}
                className="h-8 px-3 text-xs"
              >
                {loading ? 'Detecting...' : 'Allow Location'}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * LocationErrorBanner - Component to show location errors
 */
interface LocationErrorBannerProps {
  className?: string
}

export function LocationErrorBanner({ className = '' }: LocationErrorBannerProps) {
  const { error, requestLocation, loading } = useLocationContext()

  if (!error) {
    return null
  }

  const getErrorMessage = () => {
    switch (error.type) {
      case 'permission':
        return 'Location access was denied. You can still search cases manually.'
      case 'timeout':
        return 'Location detection timed out. Please try again.'
      case 'unavailable':
        return 'Location services are currently unavailable.'
      default:
        return 'Unable to detect your location. You can still search cases manually.'
    }
  }

  const canRetry = error.type !== 'permission'

  return (
    <Card className={`border-destructive/20 bg-destructive/5 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-destructive mb-2">
              {getErrorMessage()}
            </p>
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestLocation}
                disabled={loading}
                className="h-7 px-2 text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
              >
                {loading ? 'Retrying...' : 'Try Again'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
