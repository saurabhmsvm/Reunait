"use client"

import { useEffect, useRef, useState } from "react"

type CaptchaRegionProps = {
  className?: string
}

export function CaptchaRegion({ className }: CaptchaRegionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const target = container.querySelector<HTMLDivElement>("#clerk-captcha")
    if (!target) return

    const handleVisibilityChange = () => {
      const nowVisible = target.childNodes.length > 0
      if (nowVisible && !visible) {
        setVisible(true)
        try {
          container.scrollIntoView({ behavior: "smooth", block: "center" })
        } catch {}
      } else if (!nowVisible && visible) {
        setVisible(false)
      }
    }

    const observer = new MutationObserver(handleVisibilityChange)
    observer.observe(target, { childList: true, subtree: true })

    // Initial check in case CAPTCHA already mounted
    handleVisibilityChange()

    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={containerRef} className={className} aria-live="polite">
      {visible && (
        <p className="mb-2 text-xs text-muted-foreground text-center" aria-label="Security check">
          Security check
        </p>
      )}
      <div className="flex justify-center">
        <div id="clerk-captcha" className="min-h-[80px]" />
      </div>
    </div>
  )
}


