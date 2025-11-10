'use client'

import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'

import { type NotificationsStore, createNotificationsStore } from '@/stores/notifications-store'
import { useUser } from '@clerk/nextjs'

export type NotificationsStoreApi = ReturnType<typeof createNotificationsStore>

export const NotificationsStoreContext = createContext<NotificationsStoreApi | undefined>(
  undefined,
)

export interface NotificationsStoreProviderProps {
  children: ReactNode
}

export const NotificationsStoreProvider = ({
  children,
}: NotificationsStoreProviderProps) => {
  const { user } = useUser()
  const persistKey = `notifications-storage:${user?.id ?? 'anon'}`

  const storeRef = useRef<NotificationsStoreApi | null>(null)
  const keyRef = useRef<string | null>(null)

  // Create or recreate the store when the user (and thus the persist key) changes
  if (storeRef.current === null || keyRef.current !== persistKey) {
    storeRef.current = createNotificationsStore(undefined, { persistKey, ownerUserId: user?.id ?? null })
    keyRef.current = persistKey
  }

  return (
    <NotificationsStoreContext.Provider value={storeRef.current}>
      {children}
    </NotificationsStoreContext.Provider>
  )
}

export const useNotificationsStore = <T,>(
  selector: (store: NotificationsStore) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T => {
  const notificationsStoreContext = useContext(NotificationsStoreContext)

  if (!notificationsStoreContext) {
    throw new Error(`useNotificationsStore must be used within NotificationsStoreProvider`)
  }

  return useStore(notificationsStoreContext, selector, equalityFn)
}
