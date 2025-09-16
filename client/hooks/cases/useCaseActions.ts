import { useState, useEffect } from 'react'
import type { CaseDetail } from '@/lib/api'
import type { Case } from '@/types'
import { useToast } from '@/contexts/toast-context'
import { useAuth } from '@clerk/nextjs'

interface UseCaseActionsProps {
  data: CaseDetail | null
}

export const useCaseActions = ({ data }: UseCaseActionsProps) => {
  const [isReportInfoOpen, setIsReportInfoOpen] = useState(false)
  const [isAiSearchLoading, setIsAiSearchLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [lastSearchedTime, setLastSearchedTime] = useState<string | null>(data?.lastSearchedTime || null)
  const [similarCases, setSimilarCases] = useState<Case[]>(data?.similarCases || [])
  const [isSimilarDialogOpen, setIsSimilarDialogOpen] = useState(false)
  const { showSuccess, showError, showShare, showSearch, showRateLimit } = useToast()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Update lastSearchedTime when data changes
  useEffect(() => {
    if (data?.lastSearchedTime) {
      setLastSearchedTime(data.lastSearchedTime)
    }
  }, [data?.lastSearchedTime])

  // Update similarCases when data changes
  useEffect(() => {
    if (data?.similarCases) {
      setSimilarCases(data.similarCases)
    }
  }, [data?.similarCases])

  // Update current time every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleShare = async () => {
    try {
      const shareData = {
        title: data?.fullName ? `${data.fullName} - Case details` : 'Case details',
        text: data?.description || 'Please review this case.',
        url: typeof window !== 'undefined' ? window.location.href : ''
      }
      
      if (navigator.share) {
        await navigator.share(shareData)
        showShare('Case shared successfully!')
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url)
        showShare('Link copied to clipboard')
      }
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  const calculateRemainingTime = (lastSearchedTime: string): number => {
    const lastSearchedTimestamp = new Date(lastSearchedTime).getTime()
    const timeDiff = currentTime - lastSearchedTimestamp
    const cooldownPeriod = 4 * 60 * 60 * 1000 // 4 hours in milliseconds
    
    return Math.max(0, cooldownPeriod - timeDiff)
  }

  const formatRemainingTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const handleAiSearch = async () => {
    if (!data?._id || isAiSearchLoading) {
      return
    }

    setIsAiSearchLoading(true)
    
    try {
      if (!isLoaded || !isSignedIn) {
        showError('Please sign in to use AI search.')
        return
      }

      const token = await getToken()
      if (!token) {
        showError('Authentication token missing. Please reload and sign in again.')
        return
      }

      const searchParams = {
        caseId: data._id,
        gender: data.gender,
        status: data.status, // 'missing' or 'found'
        country: data.country,
        date: data.dateMissingFound // date when person went missing or was found
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.3:3001'}/api/find-matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(searchParams)
      })

      const responseData = await response.json()

      if (response.ok && responseData.success) {
        // Success - update lastSearchedTime and store results; auto-open if any
        if (responseData.lastSearchedTime) {
          setLastSearchedTime(responseData.lastSearchedTime)
        }
        const results: Case[] = Array.isArray(responseData.data) ? responseData.data : []
        setSimilarCases(results)
        if (results.length > 0) {
          setIsSimilarDialogOpen(true)
        }
        showSearch(responseData.message || `Found ${results.length} similar cases.`)
      } else {
        if (response.status === 429) {
          // Rate limit exceeded - update lastSearchedTime from response
          if (responseData.lastSearchedTime) {
            setLastSearchedTime(responseData.lastSearchedTime)
          }
          showRateLimit(responseData.message || 'Rate limit exceeded. Please try again later.')
        } else {
          showError(responseData.message || 'Search failed. Please try again.')
        }
      }
    } catch (error) {
      console.error('Find Matches error:', error)
      showError('Search failed. Please check your connection and try again.')
    } finally {
      setIsAiSearchLoading(false)
    }
  }

  const handleReportInfo = () => {
    setIsReportInfoOpen(true)
  }

  const handleReportInfoClose = () => {
    setIsReportInfoOpen(false)
  }

  const handleReportSuccess = () => {
    showSuccess('Report submitted successfully! Thank you for your contribution.')
  }

  // Calculate remaining time for display
  const aiSearchRemainingTime = lastSearchedTime ? calculateRemainingTime(lastSearchedTime) : 0
  const isAiSearchEnabled = aiSearchRemainingTime === 0
  const remainingTimeFormatted = aiSearchRemainingTime > 0 ? formatRemainingTime(aiSearchRemainingTime) : ''

  const hasSimilarResults = similarCases.length > 0
  const openSimilarDialog = () => {
    if (hasSimilarResults) setIsSimilarDialogOpen(true)
  }

  return {
    isReportInfoOpen,
    isAiSearchLoading,
    aiSearchRemainingTime,
    isAiSearchEnabled,
    remainingTimeFormatted,
    handleShare,
    handleAiSearch,
    handleReportInfo,
    handleReportInfoClose,
    handleReportSuccess,
    similarCases,
    hasSimilarResults,
    isSimilarDialogOpen,
    setIsSimilarDialogOpen,
    openSimilarDialog,
  }
}

