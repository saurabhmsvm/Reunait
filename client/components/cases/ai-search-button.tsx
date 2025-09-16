"use client"

import { useState } from "react"
import { Brain, Loader } from "lucide-react"
import { GradientButton } from "@/components/ui/gradient-button"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/nextjs"
import { useToast } from "@/contexts/toast-context"

interface AiSearchButtonProps {
  caseId: string
  onSearchComplete?: (results: any) => void
  className?: string
}

export function AiSearchButton({ caseId, onSearchComplete, className }: AiSearchButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitMessage, setRateLimitMessage] = useState("")
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { showError } = useToast()

  const handleSearch = async () => {
    if (isLoading || isRateLimited) return

    setIsLoading(true)
    setIsRateLimited(false)
    setRateLimitMessage("")
    
    try {
      if (!isLoaded || !isSignedIn) {
        showError('Please sign in to use AI search.')
        return
      }

      const token = await getToken()
      if (!token) {
        showError('Authentication token is missing. Please reload and sign in again.')
        return
      }
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.3:3001'
      const response = await fetch(`${backendUrl}/api/find-matches`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
