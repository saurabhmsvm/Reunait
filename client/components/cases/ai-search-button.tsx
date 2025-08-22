"use client"

import { useState, useEffect } from "react"
import { Brain, Loader } from "lucide-react"
import { GradientButton } from "@/components/ui/gradient-button"
import { cn } from "@/lib/utils"

interface AiSearchButtonProps {
  caseId: string
  onSearchComplete?: (results: any) => void
  className?: string
}

export function AiSearchButton({ caseId, onSearchComplete, className }: AiSearchButtonProps) {
  const [remainingTime, setRemainingTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Check remaining time on mount
  useEffect(() => {
    checkRemainingTime()
  }, [])

  // Real-time countdown
  useEffect(() => {
    if (remainingTime <= 0) return

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1000
        return newTime > 0 ? newTime : 0
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [remainingTime])

  const checkRemainingTime = async () => {
    try {
      const response = await fetch('/api/ai-search/status')
      if (response.ok) {
        const data = await response.json()
        setRemainingTime(data.remainingTime || 0)
      }
    } catch (error) {
      console.error('Failed to check remaining time:', error)
    }
  }

  const formatRemainingTime = (ms: number): string => {
    if (ms <= 0) return "Available"
    
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const handleSearch = async () => {
    if (remainingTime > 0 || isLoading) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId })
      })

      const data = await response.json()

      if (response.status === 429) {
        setRemainingTime(data.remainingTime)
        alert(data.message || 'Rate limit exceeded. Please try again later.')
      } else if (response.ok) {
        onSearchComplete?.(data.results)
        // Update remaining time after successful search
        setRemainingTime(24 * 60 * 60 * 1000) // 24 hours in milliseconds
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

  const isEnabled = remainingTime <= 0 && !isLoading

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
          {isLoading 
            ? "Searching..." 
            : remainingTime > 0 
              ? `Available in ${formatRemainingTime(remainingTime)}`
              : "AI Search"
          }
        </span>
      </div>
    </GradientButton>
  )
}
