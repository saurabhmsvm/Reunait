"use client"

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { SimpleLoader } from '@/components/ui/simple-loader'
import { createPortal } from 'react-dom'
import { useNavigationLoader } from '@/hooks/use-navigation-loader'

interface HeroSectionButtonProps {
  casesRoute?: string
}

export default function HeroSectionButton({ casesRoute = '/cases' }: HeroSectionButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, mounted, startLoading, stopLoading } = useNavigationLoader()

  const stopAfterNextPaint = React.useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => stopLoading()))
  }, [stopLoading])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    startLoading({ expectRouteChange: pathname !== casesRoute })
    if (pathname === casesRoute) {
      // Same-route click: show loader briefly, then clear after next paint
      stopAfterNextPaint()
    } else {
      router.push(casesRoute)
    }
  }

  return (
    <>
      {/* Full Screen Loader with Background Blur (Portal to body) */}
      {isLoading && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
          <SimpleLoader />
        </div>,
        document.body
      )}

      {/* Original Button with Cursor Pointer */}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-8 rounded-full border p-2 pl-6 transition-all duration-300 dark:border-t-white/5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className="text-foreground text-base font-semibold">
          View & Search Cases
        </span>
        <span className="dark:border-background block h-5 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

        <div className="bg-background group-hover:bg-muted size-8 overflow-hidden rounded-full duration-500">
          <div className="flex w-16 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
            <span className="flex size-8">
              <ArrowRight className="m-auto size-4" />
            </span>
            <span className="flex size-8">
              <ArrowRight className="m-auto size-4" />
            </span>
          </div>
        </div>
      </button>
    </>
  )
}

