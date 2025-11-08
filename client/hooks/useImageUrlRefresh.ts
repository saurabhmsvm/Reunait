"use client"

import { useCallback, useRef, useEffect, useState } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string

interface RefreshRequest {
  caseId: string
  imageIndex: number
}

interface RefreshResponse {
  caseId: string
  imageIndex: number
  success: boolean
  url?: string
  error?: string
}

interface QueuedRequest extends RefreshRequest {
  resolve: (url: string | null) => void
  reject: (error: Error) => void
  retries: number
}

interface UrlMetadata {
  url: string
  createdAt: number // timestamp in milliseconds
  expiresIn: number // expiration time in milliseconds
}

/**
 * Hook for proactive presigned URL refresh with expiration tracking
 * Industry best practice: Refreshes URLs before expiration (at 80% of expiry time)
 * 
 * Features:
 * - Tracks URL creation time and expiration
 * - Proactive background refresh at 80% of expiration
 * - Automatic refresh scheduling
 * - Error-based fallback
 * - Batch processing for efficiency
 */
export function useImageUrlRefresh() {
  const [version, setVersion] = useState(0)
  const queueRef = useRef<Map<string, QueuedRequest>>(new Map())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false)
  const urlMetadataRef = useRef<Map<string, UrlMetadata>>(new Map())
  const refreshTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const scheduleProactiveRefreshRef = useRef<((caseId: string, imageIndex: number, key: string) => void) | null>(null)
  // Cache expiry time from backend (will be set on first API call)
  const expirySecondsRef = useRef<number>(180) // Default: 180 seconds (fallback)

  // Maximum retries per image
  const MAX_RETRIES = 2
  // Debounce delay in milliseconds
  const DEBOUNCE_DELAY = 500
  // Maximum batch size
  const MAX_BATCH_SIZE = 20
  // Proactive refresh at 80% of expiration time (industry standard)
  const REFRESH_THRESHOLD = 0.8

  /**
   * Process the queue of refresh requests
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.size === 0) {
      return
    }

    isProcessingRef.current = true

    try {
      // Get all queued requests
      const requests: RefreshRequest[] = []
      const queueEntries = Array.from(queueRef.current.values())
      
      // Limit batch size
      const batch = queueEntries.slice(0, MAX_BATCH_SIZE)
      
      for (const item of batch) {
        requests.push({
          caseId: item.caseId,
          imageIndex: item.imageIndex,
        })
      }

      if (requests.length === 0) {
        isProcessingRef.current = false
        return
      }

      // Call batch refresh API
      const response = await fetch(`${API_BASE_URL}/cases/images/refresh-urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success || !Array.isArray(data.data)) {
        throw new Error(data.message || "Invalid response from server")
      }

      // Update cached expiry time from backend response (industry best practice: single source of truth)
      if (typeof data.expirySeconds === 'number' && data.expirySeconds > 0) {
        expirySecondsRef.current = data.expirySeconds
      }

      const responses: RefreshResponse[] = data.data
      const now = Date.now()
      const URL_EXPIRY_MS = expirySecondsRef.current * 1000

      // Process responses and resolve/reject promises
      for (const response of responses) {
        const key = `${response.caseId}-${response.imageIndex}`
        const queued = queueRef.current.get(key)

        if (!queued) continue

        if (response.success && response.url) {
          // Store URL metadata with creation time (industry best practice)
          urlMetadataRef.current.set(key, {
            url: response.url,
            createdAt: now,
            expiresIn: URL_EXPIRY_MS,
          })

          // Schedule proactive refresh at 80% of expiration time
          if (scheduleProactiveRefreshRef.current) {
            scheduleProactiveRefreshRef.current(response.caseId, response.imageIndex, key)
          }

          queued.resolve(response.url)
          queueRef.current.delete(key)
          // Bump version so consumers recompute URLs
          setVersion(v => (v + 1) | 0)
        } else {
          // Retry logic
          if (queued.retries < MAX_RETRIES) {
            queued.retries++
            // Re-queue for retry (will be processed in next batch)
            // Don't delete from queue, let it be processed again
          } else {
            queued.reject(
              new Error(response.error || "Failed to refresh URL after retries")
            )
            queueRef.current.delete(key)
          }
        }
      }

      // Process remaining items in queue (if any)
      if (queueRef.current.size > 0) {
        // Schedule next batch
        setTimeout(() => {
          isProcessingRef.current = false
          processQueue()
        }, DEBOUNCE_DELAY)
      } else {
        isProcessingRef.current = false
      }
    } catch (error) {
      // Reject all pending requests in this batch
      const batch = Array.from(queueRef.current.values()).slice(0, MAX_BATCH_SIZE)
      for (const item of batch) {
        const key = `${item.caseId}-${item.imageIndex}`
        item.reject(error instanceof Error ? error : new Error("Unknown error"))
        queueRef.current.delete(key)
      }
      isProcessingRef.current = false

      // Retry remaining items
      if (queueRef.current.size > 0) {
        setTimeout(() => {
          processQueue()
        }, DEBOUNCE_DELAY)
      }
    }
  }, [])

  /**
   * Internal refresh function (used for proactive refresh)
   */
  const refreshUrlInternal = useCallback(
    (caseId: string, imageIndex: number): Promise<string | null> => {
      return new Promise((resolve, reject) => {
        const key = `${caseId}-${imageIndex}`

        // Add to queue for proactive refresh
        queueRef.current.set(key, {
          caseId,
          imageIndex,
          resolve,
          reject,
          retries: 0,
        })

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          processQueue()
        }, DEBOUNCE_DELAY)
      })
    },
    [processQueue]
  )

  /**
   * Schedule proactive refresh for a URL (industry best practice)
   * Refreshes at 80% of expiration time to prevent errors
   */
  const scheduleProactiveRefresh = useCallback(
    (caseId: string, imageIndex: number, key: string) => {
      // Clear existing timer if any
      const existingTimer = refreshTimersRef.current.get(key)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Calculate proactive refresh time based on current expiry setting
      const URL_EXPIRY_MS = expirySecondsRef.current * 1000
      const PROACTIVE_REFRESH_TIME = URL_EXPIRY_MS * REFRESH_THRESHOLD

      // Schedule proactive refresh at 80% of expiration
      const timer = setTimeout(() => {
        // Proactively refresh before expiration
        refreshUrlInternal(caseId, imageIndex)
          .then((newUrl) => {
            if (newUrl) {
              // Update metadata
              const currentExpiryMs = expirySecondsRef.current * 1000
              urlMetadataRef.current.set(key, {
                url: newUrl,
                createdAt: Date.now(),
                expiresIn: currentExpiryMs,
              })
              // Schedule next proactive refresh (recursive)
              if (scheduleProactiveRefreshRef.current) {
                scheduleProactiveRefreshRef.current(caseId, imageIndex, key)
              }
              // Notify consumers
              setVersion(v => (v + 1) | 0)
            }
          })
          .catch(() => {
            // Silent fail - error handler will catch on next access
            // Will retry on next user interaction
          })
      }, PROACTIVE_REFRESH_TIME)

      refreshTimersRef.current.set(key, timer)
    },
    [refreshUrlInternal]
  )

  // Store scheduleProactiveRefresh in ref so processQueue can access it
  scheduleProactiveRefreshRef.current = scheduleProactiveRefresh

  /**
   * Queue a refresh request for an image
   * Returns a promise that resolves with the new URL or rejects on error
   * Checks if URL is still valid before refreshing (industry best practice)
   */
  const refreshUrl = useCallback(
    (caseId: string, imageIndex: number): Promise<string | null> => {
      return new Promise((resolve, reject) => {
        const key = `${caseId}-${imageIndex}`

        // Check if we have a valid cached URL (industry best practice)
        const metadata = urlMetadataRef.current.get(key)
        if (metadata) {
          const age = Date.now() - metadata.createdAt
          const isExpired = age >= metadata.expiresIn

          if (!isExpired) {
            // URL is still valid, return cached URL
            resolve(metadata.url)
            return
          }
        }

        // If already queued, return existing promise
        const existing = queueRef.current.get(key)
        if (existing) {
          existing.resolve = resolve
          existing.reject = reject
          return
        }

        // Add to queue
        queueRef.current.set(key, {
          caseId,
          imageIndex,
          resolve,
          reject,
          retries: 0,
        })

        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Debounce: schedule processing after delay
        timeoutRef.current = setTimeout(() => {
          processQueue()
        }, DEBOUNCE_DELAY)
      })
    },
    [processQueue]
  )

  /**
   * Get current URL for an image (returns cached if valid, otherwise triggers refresh)
   * Industry best practice: Check expiration before use
   * 
   * When first called with originalUrl, it initializes tracking and schedules proactive refresh
   */
  const getUrl = useCallback(
    (caseId: string, imageIndex: number, originalUrl: string): string => {
      const key = `${caseId}-${imageIndex}`
      const metadata = urlMetadataRef.current.get(key)

      if (metadata) {
        const age = Date.now() - metadata.createdAt
        const isExpired = age >= metadata.expiresIn

        if (!isExpired) {
          // Return cached valid URL
          return metadata.url
        }
      }

      // URL expired or not cached
      // Initialize metadata for original URL (assume it's fresh from SSR)
      // This ensures proactive refresh is scheduled even for original URLs
      if (!metadata) {
        const now = Date.now()
        const currentExpiryMs = expirySecondsRef.current * 1000
        urlMetadataRef.current.set(key, {
          url: originalUrl,
          createdAt: now,
          expiresIn: currentExpiryMs,
        })
        
        // Schedule proactive refresh for original URL
        if (scheduleProactiveRefreshRef.current) {
          scheduleProactiveRefreshRef.current(caseId, imageIndex, key)
        }
      }

      // Trigger refresh in background to get fresh URL
      // This will update metadata and reschedule proactive refresh
      refreshUrl(caseId, imageIndex)
        .then((newUrl) => {
          if (newUrl) {
            // Metadata and proactive refresh are already updated in processQueue
          }
        })
        .catch(() => {
          // Silent fail - will use original URL and refresh on error
        })

      return originalUrl
    },
    [refreshUrl]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Clear all proactive refresh timers
      for (const timer of refreshTimersRef.current.values()) {
        clearTimeout(timer)
      }
      refreshTimersRef.current.clear()

      // Reject all pending requests
      for (const item of queueRef.current.values()) {
        item.reject(new Error("Component unmounted"))
      }
      queueRef.current.clear()
    }
  }, [])

  return { refreshUrl, getUrl, version }
}

