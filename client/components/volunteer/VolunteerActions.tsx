"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SimpleLoader } from '@/components/ui/simple-loader'
import { useNavigationLoader } from '@/hooks/use-navigation-loader'

export function VolunteerActions() {
  const router = useRouter()
  const { isLoading: isNavLoading, mounted, startLoading } = useNavigationLoader()

  const handleVerificationsClick = () => {
    startLoading({ expectRouteChange: true })
    router.push('/volunteer/verifications')
  }

  const handleFlaggedClick = () => {
    startLoading({ expectRouteChange: true })
    router.push('/volunteer/flagged')
  }

  return (
    <>
      {isNavLoading && mounted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <SimpleLoader />
        </div>
      )}
      <div className="mt-8 md:mt-10 flex flex-wrap justify-center gap-4 md:gap-6">
        <Button size="lg" className="cursor-pointer" onClick={handleVerificationsClick} disabled={isNavLoading}>
          Go to Verifications
        </Button>
        <Button size="lg" variant="outline" className="cursor-pointer" onClick={handleFlaggedClick} disabled={isNavLoading}>
          Review Flagged Cases
        </Button>
      </div>
    </>
  )
}

