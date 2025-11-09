"use client"

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useNotificationsFetch } from '@/hooks/use-notifications-fetch';
import { useNotificationsSSE } from '@/hooks/use-notifications-sse';
import { useNotificationsStore } from '@/providers/notifications-store-provider';

/**
 * NotificationFetcher component
 * Handles both initial notification fetching (API) and real-time updates (SSE)
 * Also clears notifications store on logout to prevent data leakage between users
 */
export function NotificationFetcher() {
  const { isSignedIn } = useAuth();
  const { fetchIfNeeded } = useNotificationsFetch();
  const reset = useNotificationsStore(s => s.reset);
  const wasSignedInRef = useRef(isSignedIn);
  
  // Initialize SSE for real-time updates (only if signed in)
  useNotificationsSSE();

  useEffect(() => {
    // Clear store when user logs out (transition from signed in to signed out)
    if (wasSignedInRef.current && !isSignedIn) {
      reset();
    }
    wasSignedInRef.current = isSignedIn;
  }, [isSignedIn, reset]);

  useEffect(() => {
    // Only fetch initial notifications if user is signed in
    if (isSignedIn) {
      fetchIfNeeded();
    }
  }, [isSignedIn, fetchIfNeeded]);

  // This component doesn't render anything, it just handles notification fetching
  return null;
}
