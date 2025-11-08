"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useNavigationLoader } from '@/hooks/use-navigation-loader'
import { SimpleLoader } from '@/components/ui/simple-loader'
import { createPortal } from 'react-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificationsStore } from '@/providers/notifications-store-provider'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

type NotificationItem = {
  id: string
  message: string
  isRead: boolean
  isClickable: boolean
  navigateTo?: string | null
  time?: string | null
}

type NotificationResponse = {
  success: boolean
  notifications: NotificationItem[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  unreadCount: number
}

export function AllNotificationsView() {
  const { getToken } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isLoading: isNavigating, mounted, startLoading } = useNavigationLoader()
  
  const markAllReadOptimistic = useNotificationsStore(s => s.markAllReadOptimistic)
  const enqueueRead = useNotificationsStore(s => s.enqueueRead)
  const flushPendingReads = useNotificationsStore(s => s.flushPendingReads)
  
  // Get initial page from URL or default to 1
  const initialPage = useMemo(() => {
    const pageParam = searchParams?.get('page')
    return pageParam ? parseInt(pageParam, 10) : 1
  }, [searchParams])

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalAll, setTotalAll] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Memoized fetch function - depends on getToken and filter
  const fetchPage = useCallback(async (page: number) => {
    setIsLoading(true)
    try {
      const token = await getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!base) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured');
      }
      const pageSize = parseInt(process.env.NEXT_PUBLIC_NOTIFICATIONS_PAGE_SIZE || '20', 10);
      // Add filter parameter if filtering by unread
      const filterParam = filter === 'unread' ? '&filter=unread' : ''
      const response = await fetch(`${base}/api/notifications?page=${page}&limit=${pageSize}${filterParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) throw new Error('Failed to fetch notifications')

      const data: NotificationResponse & { totalAll?: number } = await response.json()
      
      // Store notifications (server-side filtered if filter is 'unread')
      setNotifications(data.notifications)
      setPagination({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      })
      setUnreadCount(data.unreadCount)
      if (typeof data.totalAll === 'number') {
        setTotalAll(data.totalAll)
      }
    } catch (error) {
      // Silently handle fetch errors
    } finally {
      setIsLoading(false)
    }
  }, [getToken, filter])

  // Update URL when page changes (separate from fetch)
  useEffect(() => {
    if (currentPage === 1) {
      // Remove page param if on page 1
      const params = new URLSearchParams(searchParams?.toString() || '')
      params.delete('page')
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`
      if (newUrl !== currentUrl) {
        router.replace(newUrl, { scroll: false })
      }
    } else {
      // Add/update page param
      const params = new URLSearchParams(searchParams?.toString() || '')
      const currentUrlPage = params.get('page')
      if (currentUrlPage !== currentPage.toString()) {
        params.set('page', currentPage.toString())
        const newUrl = `${pathname}?${params.toString()}`
        router.replace(newUrl, { scroll: false })
      }
    }
  }, [currentPage, pathname, router, searchParams])

  // Sync currentPage when URL changes (only on external navigation)
  useEffect(() => {
    const urlPage = parseInt(searchParams?.get('page') || '1', 10)
    if (urlPage !== currentPage && urlPage >= 1) {
      setCurrentPage(urlPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.get('page')])

  // Fetch when page or filter changes (only fetch, don't update URL here)
  useEffect(() => {
    if (currentPage >= 1) {
      fetchPage(currentPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filter])

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page !== currentPage) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  const handleMarkAllRead = useCallback(async () => {
    const token = await getToken()
    if (token) {
      await markAllReadOptimistic(token)
      // Refresh current page to reflect changes
      fetchPage(currentPage)
    }
  }, [getToken, markAllReadOptimistic, fetchPage, currentPage])

  const handleNotificationClick = useCallback(async (notification: NotificationItem) => {
    // Optimistically update local state immediately for instant UI feedback
    if (!notification.isRead) {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    
    // Also update the store for consistency
    enqueueRead(notification.id)
    const token = await getToken()
    if (token) {
      await flushPendingReads(token)
    }

    if (notification.isClickable && notification.navigateTo) {
      const isInternal = notification.navigateTo.startsWith('/')
      if (isInternal) {
        const [targetPath, targetQuery = ""] = notification.navigateTo.split('?')
        const currentQuery = searchParams?.toString() || ""
        const treatAsSameRoute = pathname === targetPath && currentQuery === targetQuery
        startLoading({ expectRouteChange: !treatAsSameRoute })
        if (treatAsSameRoute) return
        router.push(notification.navigateTo)
      } else {
        startLoading({ expectRouteChange: true })
        window.location.href = notification.navigateTo
      }
    }
  }, [enqueueRead, getToken, flushPendingReads, pathname, searchParams, router, startLoading])


  const timeAgo = useCallback((iso?: string | null, showAgo: boolean = true) => {
    if (!iso) return ""
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    const suffix = showAgo ? " ago" : ""
    if (diff < 60) return `${diff}s${suffix}`
    const m = Math.floor(diff / 60)
    if (m < 60) return `${m}m${suffix}`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h${suffix}`
    const days = Math.floor(h / 24)
    return `${days}d${suffix}`
  }, [])

  // Server-side filtering now supported, so no client-side filtering needed
  // Notifications are already filtered by the API based on the filter parameter
  const filteredNotifications = useMemo(() => {
    return notifications
  }, [notifications])

  const handleFilterChange = useCallback((newFilter: 'all' | 'unread') => {
    setFilter(newFilter)
    // Reset to page 1 when filter changes
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [currentPage])

  return (
    <>
      {/* Navigation Loader */}
      {isNavigating && mounted && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md">
          <SimpleLoader />
        </div>,
        document.body
      )}

      <div className="space-y-5 w-full min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {(totalAll ?? pagination.totalItems)} total
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1">
                  <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[11px]">{unreadCount}</Badge>
                  unread
                </span>
              </div>
            </div>
          </div>
          <div>
            <Button
              onClick={handleMarkAllRead}
              variant="outline"
              size="sm"
              className="hover:shadow-sm"
            >
              Mark all as read
            </Button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <div className="rounded-full border p-0.5 bg-muted/40 dark:bg-muted/30 dark:border-muted/40">
            <button
              className={cn(
                "px-3 h-7 text-xs rounded-full transition-colors",
                filter === 'all' 
                  ? "bg-background shadow-sm dark:bg-primary/15 dark:text-primary dark:ring-1 dark:ring-primary/30 dark:shadow-sm" 
                  : "text-muted-foreground dark:text-muted-foreground"
              )}
              aria-pressed={filter === 'all'}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              className={cn(
                "px-3 h-7 text-xs rounded-full transition-colors",
                filter === 'unread' 
                  ? "bg-background shadow-sm dark:bg-primary/15 dark:text-primary dark:ring-1 dark:ring-primary/30 dark:shadow-sm" 
                  : "text-muted-foreground dark:text-muted-foreground"
              )}
              aria-pressed={filter === 'unread'}
              onClick={() => handleFilterChange('unread')}
            >
              Unread
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="mt-6 w-full min-w-0 overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Table */}
          {!isLoading && (
            <>
              <div className="rounded-xl border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden w-full">
                  <Table className="w-full table-fixed">
                    <colgroup>
                      <col style={{ width: 'calc(100% - 100px)' }} className="md:w-[calc(100%-140px)]" />
                      <col style={{ width: '100px' }} className="md:w-[140px]" />
                    </colgroup>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-0">Message</TableHead>
                          <TableHead className="w-[100px] md:w-[140px] text-right shrink-0">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNotifications.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="h-40 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-muted-foreground">
                                  {filter === 'unread' 
                                    ? 'No unread notifications on this page' 
                                    : 'No notifications'}
                                </p>
                                {filter === 'unread' && pagination.totalPages > 1 && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Try navigating to another page
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredNotifications.map((notification) => (
                            <TableRow
                              key={notification.id}
                              className={cn(
                                "cursor-pointer transition-colors",
                                !notification.isRead 
                                  ? "bg-primary/5 dark:bg-primary/20 hover:bg-primary/10 dark:hover:bg-primary/30" 
                                  : "hover:bg-muted/40 dark:hover:bg-muted/70"
                              )}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <TableCell className="min-w-0 pr-2 md:pr-4 !whitespace-normal">
                                <div className={cn(
                                  "text-sm leading-5 break-words",
                                  "md:line-clamp-2",
                                  notification.isRead ? "text-muted-foreground" : "font-medium"
                                )} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  {notification.message}
                                </div>
                              </TableCell>
                              <TableCell className="text-right w-[100px] md:w-[140px] shrink-0 pl-2">
                                {/* Mobile: time without "ago", Desktop: full time with "ago" */}
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                  <span className="md:hidden">{timeAgo(notification.time, false)}</span>
                                  <span className="hidden md:inline">{timeAgo(notification.time, true)}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                </div>

              {/* Pagination - Now enabled for both all and unread filters with server-side filtering */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center pt-6">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
