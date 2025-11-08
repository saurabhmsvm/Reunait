"use client"

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Toast } from '@/components/ui/toast'

interface ToastMessage {
  id: string
  message: string
  type: "error" | "success" | "info" | "warning" | "search" | "share" | "rate-limit"
  title?: string
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type: ToastMessage['type'], title?: string, duration?: number) => void
  showSuccess: (message: string, title?: string) => void
  showError: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showSearch: (message: string, title?: string) => void
  showShare: (message: string, title?: string) => void
  showRateLimit: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timersRef = useRef<Record<string, any>>({})

  const showToast = useCallback((
    message: string,
    type: ToastMessage['type'],
    title?: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastMessage = {
      id,
      message,
      type,
      title,
      duration: duration || (type === 'error' ? 7000 : 5000)
    }

    // Replace existing toasts of the same type, leave others intact; add instantly
    setToasts(prev => {
      const kept = prev.filter(t => t.type !== type)
      return [...kept, newToast]
    })

    // Schedule auto-dismiss independent of child component behavior
    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      delete timersRef.current[id]
    }, newToast.duration)
    timersRef.current[id] = timeoutId
  }, [])

  const removeToast = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast(message, 'success', title || 'Success')
  }, [showToast])

  const showError = useCallback((message: string, title?: string) => {
    showToast(message, 'error', title || 'Error')
  }, [showToast])

  const showInfo = useCallback((message: string, title?: string) => {
    showToast(message, 'info', title || 'Information')
  }, [showToast])

  const showWarning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', title || 'Warning')
  }, [showToast])

  const showSearch = useCallback((message: string, title?: string) => {
    showToast(message, 'search', title || 'Search Results')
  }, [showToast])

  const showShare = useCallback((message: string, title?: string) => {
    showToast(message, 'share', title || 'Shared')
  }, [showToast])

  const showRateLimit = useCallback((message: string, title?: string) => {
    showToast(message, 'rate-limit', title || 'Rate Limited (4h cooldown)', 8000)
  }, [showToast])

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showSearch,
    showShare,
    showRateLimit
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-none">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{ 
              zIndex: 1000 - index
            }}
            className="animate-in slide-in-from-right-full duration-300"
          >
            <Toast
              message={toast.message}
              type={toast.type}
              title={toast.title}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
