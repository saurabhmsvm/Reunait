"use client"

import { useState } from "react"
import { Brain, Loader } from "lucide-react"
import { GradientButton } from "@/components/ui/gradient-button"
import { cn } from "@/lib/utils"

interface AiSearchButtonProps {
  caseId: string
  onSearchComplete?: (results: any) => void
  className?: string
}

export function AiSearchButton({ caseId, onSearchComplete, className }: AiSearchButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitMessage, setRateLimitMessage] = useState("")

  const handleSearch = async () => {
    if (isLoading || isRateLimited) return

    setIsLoading(true)
    setIsRateLimited(false)
    setRateLimitMessage("")
    
    try {
      const response = await fetch('/api/find-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId })
      })

      const data = await response.json()

      if (response.status === 429) {
        // Rate limit exceeded - disable button and show message
        setIsRateLimited(true)
        setRateLimitMessage(data.message || 'Rate limit exceeded. Please try again later.')
        alert(data.message || 'Rate limit exceeded. Please try again later.')
      } else if (response.ok) {
        onSearchComplete?.(data.data)
        // Success - button remains enabled for next search
      } else {
        alert('Search failed. Please try again.')
      }
    } catch (error) {
      console.error('AI Search error:', error)
      alert('Search failed. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isEnabled = !isLoading && !isRateLimited

  return (
    <GradientButton
      onClick={handleSearch}
      disabled={!isEnabled}
      className={cn(
        "min-w-[120px] sm:min-w-[140px] h-10 px-3 sm:px-4 text-sm",
        !isEnabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {isLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Brain className="w-4 h-4" />
        )}
        
        <span>
          {
            isLoading ? "Searching..." : isRateLimited ? "Rate Limited" : "AI Search"
          }
        </span>
      </div>
    </GradientButton>
  )
}
