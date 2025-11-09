import { createStore } from 'zustand/vanilla'
import { persist, createJSONStorage } from 'zustand/middleware'

export type NotificationItem = {
  id: string
  message: string
  isRead: boolean
  isClickable: boolean
  navigateTo?: string | null
  time?: string | null
}

export type NotificationsState = {
  notifications: NotificationItem[]
  unreadCount: number
  lastSeenAt: string | null
  pendingReadIds: Set<string>
  hasHydrated: boolean
  pagination: {
    currentPage: number
    hasNextPage: boolean
    totalPages: number
  }
  isFetching: boolean
}

export type NotificationsActions = {
  ingestFromMeta: (meta: any) => void
  ingestInitial: (
    notifications: NotificationItem[],
    pagination?: { currentPage: number; hasNextPage: boolean; totalPages: number; totalItems?: number; hasPrevPage?: boolean },
    unreadCount?: number,
  ) => void
  setLastSeenAt: () => void
  enqueueRead: (id: string) => void
  flushPendingReads: (token?: string) => Promise<void>
  markAllReadOptimistic: (token?: string) => void
  fetchNotifications: (token: string, page?: number) => Promise<any>
  addNotification: (notification: NotificationItem) => void
  reset: () => void
}

export type NotificationsStore = NotificationsState & NotificationsActions

export const defaultInitState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  lastSeenAt: null,
  pendingReadIds: new Set<string>(),
  hasHydrated: false,
  pagination: {
    currentPage: 1,
    hasNextPage: false,
    totalPages: 0
  },
  isFetching: false
}

// Lightweight client helper to call backend
async function postJson(path: string, body: any, token?: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured');
  }
  const url = `${base}${path}`
  
  
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {})
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    throw error
  }
}

export const createNotificationsStore = (
  initState: NotificationsState = defaultInitState,
) => {
  return createStore<NotificationsStore>()(
    persist(
      (set, get) => ({
        ...initState,

        ingestFromMeta: (meta: any) => {
          if (!meta || !Array.isArray(meta.notifications)) {
            return
          }
          const incoming: NotificationItem[] = meta.notifications
          set((state) => {
            const byId = new Map<string, NotificationItem>()
            // Preserve local read status - don't override with server data
            for (const n of state.notifications) byId.set(n.id, n)
            for (const n of incoming) {
              // Only update if we don't have this notification locally, or if server has newer data
              const existing = byId.get(n.id)
              if (!existing || (existing.isRead && !n.isRead)) {
                // Keep local read status if we've already marked it as read
                byId.set(n.id, existing?.isRead ? { ...n, isRead: true } : n)
              }
            }
            const merged = Array.from(byId.values()).sort((a, b) => {
              const at = a.time ? Date.parse(a.time) : 0
              const bt = b.time ? Date.parse(b.time) : 0
              return bt - at
            })
            const unreadCount = merged.filter(n => !n.isRead).length
            return { notifications: merged, unreadCount }
          })
        },

        // Ingest initial batch from SSE with optional pagination/unreadCount
        ingestInitial: (initial, pagination, incomingUnread) => {
          set((state) => {
            // Merge initial into current, dedupe by id, then sort desc by time
            const byId = new Map<string, NotificationItem>()
            for (const n of state.notifications) byId.set(n.id, n)
            for (const n of initial) byId.set(n.id, n)
            const merged = Array.from(byId.values()).sort((a, b) => {
              const at = a.time ? Date.parse(a.time) : 0
              const bt = b.time ? Date.parse(b.time) : 0
              return bt - at
            })

            const unreadCount = typeof incomingUnread === 'number' ? incomingUnread : merged.filter(n => !n.isRead).length

            // Apply memory limit (keep newest N notifications)
            const memoryLimit = parseInt(process.env.NEXT_PUBLIC_NOTIFICATIONS_MEMORY_LIMIT || '100', 10);
            const trimmed = merged.length > memoryLimit ? merged.slice(0, memoryLimit) : merged

            return {
              notifications: trimmed,
              unreadCount,
              pagination: pagination ? {
                currentPage: pagination.currentPage,
                hasNextPage: pagination.hasNextPage,
                totalPages: pagination.totalPages,
              } : state.pagination,
            }
          })
        },

        setLastSeenAt: () => {
          const ts = new Date().toISOString()
          set({ lastSeenAt: ts })
          try { localStorage.setItem('notif:lastSeenAt', ts) } catch {}
        },

        enqueueRead: (id: string) => {
          set((state) => {
            const pending = new Set(state.pendingReadIds)
            pending.add(id)
            const updated = state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
            const unreadCount = updated.filter(n => !n.isRead).length
            return { pendingReadIds: pending, notifications: updated, unreadCount }
          })
        },

        flushPendingReads: async (token?: string) => {
          const ids = Array.from(get().pendingReadIds)
          if (ids.length === 0) return
          set({ pendingReadIds: new Set<string>() })
          try {
            await postJson('/api/notifications/read', { ids }, token)
          } catch (err) {
            // Re-add the IDs to pending if the request failed
            set((state) => ({
              pendingReadIds: new Set([...Array.from(state.pendingReadIds), ...ids])
            }))
          }
        },

        markAllReadOptimistic: (token?: string) => {
          set((state) => {
            const updated = state.notifications.map(n => ({ ...n, isRead: true }))
            return { notifications: updated, unreadCount: 0, pendingReadIds: new Set<string>() }
          })
          // Fire and forget - don't await to keep UI responsive
          postJson('/api/notifications/read-all', {}, token).catch(() => {})
        },

        fetchNotifications: async (token: string, page: number = 1) => {
          try {
            set({ isFetching: true });
            
            const base = process.env.NEXT_PUBLIC_BACKEND_URL;
            if (!base) {
              throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured');
            }
            const pageSize = parseInt(process.env.NEXT_PUBLIC_NOTIFICATIONS_PAGE_SIZE || '20', 10);
            const response = await fetch(`${base}/api/notifications?page=${page}&limit=${pageSize}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) throw new Error('Failed to fetch notifications');
            
            const data = await response.json();
            
            set((state) => {
              const existing = page === 1 ? [] : state.notifications;
              const merged = [...existing, ...data.notifications];
              
              // Remove duplicates by id
              const byId = new Map(merged.map(n => [n.id, n]));
              const unique = Array.from(byId.values());
              
              // Memory management: Keep only last N notifications in memory
              // This prevents memory explosion with large notification counts
              const memoryLimit = parseInt(process.env.NEXT_PUBLIC_NOTIFICATIONS_MEMORY_LIMIT || '100', 10);
              const trimmed = unique.length > memoryLimit 
                ? unique.slice(-memoryLimit) 
                : unique;
              
              return {
                notifications: trimmed,
                unreadCount: data.unreadCount,
                pagination: data.pagination,
                isFetching: false
              };
            });
            
            return data;
          } catch (error) {
            set({ isFetching: false });
            throw error;
          }
        },

        addNotification: (notification: NotificationItem) => {
          set((state) => {
            // Check if notification already exists (deduplication)
            const existingIndex = state.notifications.findIndex(n => n.id === notification.id);
            if (existingIndex >= 0) {
              // Update existing notification (preserve local read status if applicable)
              const existing = state.notifications[existingIndex];
              const updated = [...state.notifications];
              updated[existingIndex] = {
                ...notification,
                // Preserve local read status if already marked as read
                isRead: existing.isRead || notification.isRead
              };
              
              // Sort by time descending
              const sorted = updated.sort((a, b) => {
                const at = a.time ? Date.parse(a.time) : 0;
                const bt = b.time ? Date.parse(b.time) : 0;
                return bt - at;
              });
              
              const serverUnread = (notification as any)?.unreadCount;
              const unreadCount = typeof serverUnread === 'number'
                ? serverUnread
                : sorted.filter(n => !n.isRead).length;
              
              return { notifications: sorted, unreadCount };
            }

            // Add new notification
            const merged = [notification, ...state.notifications];
            
            // Sort by time descending
            const sorted = merged.sort((a, b) => {
              const at = a.time ? Date.parse(a.time) : 0;
              const bt = b.time ? Date.parse(b.time) : 0;
              return bt - at;
            });
            
            // Memory management: Keep only last N notifications
            const memoryLimit = parseInt(process.env.NEXT_PUBLIC_NOTIFICATIONS_MEMORY_LIMIT || '100', 10);
            const trimmed = sorted.length > memoryLimit 
              ? sorted.slice(0, memoryLimit) // Keep first N (newest)
              : sorted;
            
            const serverUnread = (notification as any)?.unreadCount;
            const unreadCount = typeof serverUnread === 'number'
              ? serverUnread
              : trimmed.filter(n => !n.isRead).length;
            
            return {
              notifications: trimmed,
              unreadCount
            };
          });
        },

        reset: () => {
          // Reset state to initial values
          set(defaultInitState);
          
          // Clear persisted storage
          try {
            localStorage.removeItem('notifications-storage');
            localStorage.removeItem('notif:lastSeenAt');
          } catch (error) {
            // Silently handle localStorage errors (e.g., in private browsing mode)
          }
        }
      }),
      {
        name: 'notifications-storage',
        storage: createJSONStorage(() => localStorage),
        onRehydrateStorage: () => (state, error) => {
          // Mark store as hydrated once persistence completes (success or error)
          try {
            ;(state as any).hasHydrated = true
          } catch {}
        },
        partialize: (state) => ({
          notifications: state.notifications.slice(0, parseInt(process.env.NEXT_PUBLIC_NOTIFICATIONS_PERSIST_LIMIT || '50', 10)), // Keep last N for better UX
          unreadCount: state.unreadCount,
          lastSeenAt: state.lastSeenAt
        }),
        version: 1,
      }
    )
  )
}
