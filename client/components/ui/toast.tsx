"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, CheckCircle, Info, Search, Share2, Heart, Shield, Clock, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps {
  message: string
  type: "error" | "success" | "info" | "warning" | "search" | "share" | "rate-limit"
  duration?: number
  onClose: () => void
  title?: string
}

const Toast = ({ message, type, duration = 5000, onClose, title }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case "search":
        return <Search className="w-5 h-5 text-purple-500" />
      case "share":
        return <Share2 className="w-5 h-5 text-blue-500" />
      case "rate-limit":
        return <Clock className="w-5 h-5 text-orange-500" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800/50 dark:text-red-200 shadow-red-100 dark:shadow-red-900/20"
      case "success":
        return "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800/50 dark:text-green-200 shadow-green-100 dark:shadow-green-900/20"
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800/50 dark:text-blue-200 shadow-blue-100 dark:shadow-blue-900/20"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-800/50 dark:text-yellow-200 shadow-yellow-100 dark:shadow-yellow-900/20"
      case "search":
        return "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/20 dark:border-purple-800/50 dark:text-purple-200 shadow-purple-100 dark:shadow-purple-900/20"
      case "share":
        return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800/50 dark:text-blue-200 shadow-blue-100 dark:shadow-blue-900/20"
      case "rate-limit":
        return "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/20 dark:border-orange-800/50 dark:text-orange-200 shadow-orange-100 dark:shadow-orange-900/20"
    }
  }

  const getTitle = () => {
    if (title) return title
    
    switch (type) {
      case "error":
        return "Error"
      case "success":
        return "Success"
      case "info":
        return "Information"
      case "warning":
        return "Warning"
      case "search":
        return "Search Results"
      case "share":
        return "Shared"
      case "rate-limit":
        return "Rate Limited"
    }
  }

  return (
    <div
      className={cn(
        "max-w-sm w-full p-4 rounded-xl border shadow-lg transition-all duration-300 backdrop-blur-sm",
        getStyles(),
        isVisible ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-full scale-95"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-current">
              {getTitle()}
            </h4>
            <button
              onClick={() => {
                setIsVisible(false)
                setTimeout(onClose, 300)
              }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-current/90 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  )
}

export { Toast }
