"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import { useNotificationsStore } from "@/providers/notifications-store-provider"
import { useAuth } from "@clerk/nextjs"
import { Bell } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useNavigationLoader } from "@/hooks/use-navigation-loader"
import { SimpleLoader } from "@/components/ui/simple-loader"
import { cn } from "@/lib/utils"

export default function NotificationsPopover() {
  const notifications = useNotificationsStore(s => s.notifications)
  const unreadCount = useNotificationsStore(s => s.unreadCount)
  const pagination = useNotificationsStore(s => s.pagination)
  const isFetching = useNotificationsStore(s => s.isFetching)
  const fetchNotifications = useNotificationsStore(s => s.fetchNotifications)
  const enqueueRead = useNotificationsStore(s => s.enqueueRead)
  const flushPendingReads = useNotificationsStore(s => s.flushPendingReads)
  const markAllReadOptimistic = useNotificationsStore(s => s.markAllReadOptimistic)
  const setLastSeenAt = useNotificationsStore(s => s.setLastSeenAt)
  const { getToken } = useAuth()
  const router = useRouter()
  const { isLoading: isNavigating, mounted, startLoading } = useNavigationLoader()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [atBottom, setAtBottom] = React.useState(true)
  const virtuosoRef = React.useRef<VirtuosoHandle | null>(null)
  const shouldStickAfterAppendRef = React.useRef(false)
  const inFlightRef = React.useRef(false)
  const prevPageRef = React.useRef(pagination.currentPage)
  const prevVisibleLenRef = React.useRef(0)

  // Prevent background scrolling when drawer is open
  React.useEffect(() => {
    if (open) {
      // Lock body scroll
      document.body.style.overflow = 'hidden'
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])
  const paginationRef = React.useRef(pagination)
  const isFetchingRef = React.useRef(isFetching)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640) // sm breakpoint
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Update refs on changes
  React.useEffect(() => { paginationRef.current = pagination }, [pagination])
  React.useEffect(() => { isFetchingRef.current = isFetching }, [isFetching])

  // Eager prefetch page 2 on open to avoid first-append timing
  React.useEffect(() => {
    const prefetch = async () => {
      if (!open) return
      if (pagination.currentPage === 1 && pagination.hasNextPage && notifications.length <= 20 && !isFetching && !inFlightRef.current) {
        try {
          inFlightRef.current = true
          shouldStickAfterAppendRef.current = true
          const token = await getToken()
          if (token) {
            await fetchNotifications(token, 2)
          }
        } finally {
          // cleared after reveal
        }
      }
    }
    prefetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pagination.currentPage, pagination.hasNextPage, notifications.length, isFetching])

  // After first append (page 1 -> 2), reveal last real item immediately
  React.useEffect(() => {
    const prev = prevPageRef.current
    const curr = pagination.currentPage
    if (open && prev === 1 && curr === 2 && notifications.length > prevVisibleLenRef.current) {
      try {
        virtuosoRef.current?.scrollToIndex({ index: notifications.length - 1, align: 'end' })
      } catch {}
      shouldStickAfterAppendRef.current = false
      inFlightRef.current = false
    }
    prevPageRef.current = curr
  }, [open, pagination.currentPage, notifications.length])

  const visible = React.useMemo(() => unreadOnly ? notifications.filter(n => !n.isRead) : notifications, [notifications, unreadOnly])
  React.useEffect(() => { prevVisibleLenRef.current = visible.length }, [visible.length])
  const listData = React.useMemo(() => {
    const base = visible
    if (!pagination.hasNextPage) return base
    if (notifications.length < 100) return [...base, { id: '__loader__' } as any]
    return [...base, { id: '__show_all__' } as any]
  }, [visible, pagination.hasNextPage, notifications.length])


  const handleItemClick = async (n: any) => {
    enqueueRead(n.id)
    const token = await getToken()
    if (token) flushPendingReads(token)
    if (n.isClickable && n.navigateTo) {
      // Close the popover immediately
      setOpen(false)
      // Check if it's an internal route or external URL
      const isInternal = n.navigateTo.startsWith('/')
      if (isInternal) {
        // Parse target path and query for same-route detection
        const [targetPath, targetQuery = ""] = n.navigateTo.split('?')
        const currentQuery = searchParams?.toString() || ""
        const treatAsSameRoute = pathname === targetPath && currentQuery === targetQuery
        startLoading({ expectRouteChange: !treatAsSameRoute })
        if (treatAsSameRoute) {
          // Do not push the same route; loader will auto-stop via no-route-change fallback
          return
        }
        router.push(n.navigateTo)
      } else {
        // External URL - use full navigation
        startLoading({ expectRouteChange: true })
        window.location.href = n.navigateTo
      }
    }
  }

  const timeAgo = (iso?: string | null) => {
    if (!iso) return ""
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    const m = Math.floor(diff / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const days = Math.floor(h / 24)
    return `${days}d ago`
  }

  return (
    <>
      {/* Navigation Loader */}
      {isNavigating && mounted && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md">
          <SimpleLoader />
        </div>,
        document.body
      )}
      <Popover open={open} onOpenChange={(v) => { if (v) setLastSeenAt(); setOpen(v) }}>
        <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-300 relative focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      {/* Background blur overlay */}
      {open && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={() => setOpen(false)} />,
        document.body
      )}
      <PopoverContent align={isMobile ? "center" : "end"} side="bottom" sideOffset={8} avoidCollisions={false} collisionPadding={8} className="z-50 w-[92vw] max-w-[420px] p-0 border shadow-md">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border p-0.5 bg-muted/40 dark:bg-muted/30 dark:border-muted/40">
              <button
                className={cn(
                  "px-2 h-6 text-xs rounded-full transition-colors",
                  !unreadOnly
                    ? "bg-background shadow-sm dark:bg-primary/15 dark:text-primary dark:ring-1 dark:ring-primary/30 dark:shadow-sm"
                    : "text-muted-foreground dark:text-muted-foreground"
                )}
                aria-pressed={!unreadOnly}
                onClick={() => setUnreadOnly(false)}
              >
                All
              </button>
              <button
                className={cn(
                  "px-2 h-6 text-xs rounded-full transition-colors",
                  unreadOnly
                    ? "bg-background shadow-sm dark:bg-primary/15 dark:text-primary dark:ring-1 dark:ring-primary/30 dark:shadow-sm"
                    : "text-muted-foreground dark:text-muted-foreground"
                )}
                aria-pressed={unreadOnly}
                onClick={() => setUnreadOnly(true)}
              >
                Unread
              </button>
            </div>
            {unreadCount > 0 && (
              <button onClick={async () => { const t = await getToken(); if (t) markAllReadOptimistic(t) }} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">Mark all as read</button>
            )}
          </div>
        </div>
        <div className="max-h-[70vh] h-full">
            {visible.length === 0 ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground px-6 py-10 text-center">
              You have no {unreadOnly ? 'unread ' : ''}notifications.
            </div>
          ) : (
              <div className="h-[60vh] p-2">
                <Virtuoso
                  ref={virtuosoRef}
                  style={{ height: '100%' }}
                  data={listData}
                  computeItemKey={(_i, item: any) => item.id}
                  defaultItemHeight={88}
                  increaseViewportBy={{ top: 200, bottom: 1200 }}
                  atBottomThreshold={200}
                  atBottomStateChange={setAtBottom}
                  followOutput={atBottom ? 'auto' : false}
                  rangeChanged={async ({ endIndex }) => {
                    const nearEnd = endIndex >= listData.length - 2
                    if (nearEnd && listData[listData.length - 1]?.id === '__loader__') {
                      if (!isFetching && !inFlightRef.current && pagination.hasNextPage && notifications.length < 100) {
                        shouldStickAfterAppendRef.current = true
                        inFlightRef.current = true
                        const token = await getToken()
                        try {
                          if (token) {
                            await fetchNotifications(token, pagination.currentPage + 1)
                          }
                        } finally {
                          inFlightRef.current = false
                        }
                      }
                    }
                  }}
                  itemContent={(_index, n: any) => {
                    if (n?.id === '__loader__') {
                      return (
                        <div className="py-2">
                          <div data-testid="notif-loadmore" className="flex justify-center items-center py-3 min-h-10">
                            <div className="text-xs text-muted-foreground">{isFetching ? 'Loading...' : 'Load more'}</div>
                          </div>
                        </div>
                      )
                    }
                    if (n?.id === '__show_all__') {
                      return (
                        <div className="py-2">
                          <div className="flex justify-center items-center py-3 min-h-10">
                            <button onClick={() => {
                              // Close the popover immediately
                              setOpen(false)
                              const target = '/notifications'
                              const [targetPath, targetQuery = ""] = target.split('?')
                              const currentQuery = searchParams?.toString() || ""
                              const treatAsSameRoute = pathname === targetPath && currentQuery === targetQuery
                              startLoading({ expectRouteChange: !treatAsSameRoute })
                              if (!treatAsSameRoute) router.push(target)
                            }} className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors">
                              Show all notifications
                            </button>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="py-2">
                        <div className={cn(
                          "group relative rounded-xl transition-colors",
                          n.isRead
                            ? "border border-border/60 bg-muted/20 hover:bg-muted/40"
                            : "border border-primary/20 bg-primary/5 hover:bg-primary/10 shadow-sm"
                        )}>
                          <div
                            onClick={() => handleItemClick(n)}
                            role="button"
                            tabIndex={0}
                            className="w-full cursor-pointer text-left px-4 py-3 focus:outline-none"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("mt-1 h-2 w-2 rounded-full", n.isRead ? "bg-muted-foreground/30" : "bg-blue-500")} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className={cn("text-sm break-words", n.isRead ? "text-muted-foreground" : "font-medium")}>{n.message}</div>
                                  <div className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">{timeAgo(n.time)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
              </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
    </>
  )
}


