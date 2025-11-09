import { useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useNotificationsStore } from '@/providers/notifications-store-provider';

/**
 * Hook for initial notification fetching
 * Only fetches once on mount if no cache exists
 * SSE handles all subsequent real-time updates
 */
export function useNotificationsFetch() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const fetchNotifications = useNotificationsStore(s => s.fetchNotifications);
  const notifications = useNotificationsStore(s => s.notifications);
  const hasHydrated = useNotificationsStore(s => s.hasHydrated);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  
  // Reset fetch flag when user changes (prevents skipping fetch for new user after logout)
  useEffect(() => {
    const currentUserId = user?.id || null;
    if (userIdRef.current !== null && userIdRef.current !== currentUserId) {
      // User changed - reset fetch flag to allow fetching for new user
      hasFetchedRef.current = false;
    }
    userIdRef.current = currentUserId;
  }, [user?.id]);
  
  const fetchIfNeeded = useCallback(async () => {
    // Only fetch if user is authenticated
    if (!user) return;
    
    // Prevent duplicate calls
    if (isFetchingRef.current) return;
    
    // Wait until persisted store has hydrated
    if (!hasHydrated) return;
    
    // Don't fetch if we've already fetched in this session for this user
    if (hasFetchedRef.current) return;
    
    // Only fetch if no cache exists (SSE will handle updates)
    const hasCache = notifications.length > 0;
    if (hasCache) {
      hasFetchedRef.current = true;
      return; // Use cached notifications, SSE will provide updates
    }
    
    try {
      isFetchingRef.current = true;
      
      // Fetch initial 20 notifications for users without cache
      const token = await getToken();
      if (token) {
        await fetchNotifications(token, 1);
        hasFetchedRef.current = true;
      }
    } catch (error) {
      // Silently handle fetch errors
    } finally {
      isFetchingRef.current = false;
    }
  }, [user, hasHydrated, fetchNotifications, getToken, notifications.length]);
  
  return { fetchIfNeeded };
}
