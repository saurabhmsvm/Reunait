'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useToast } from "@/contexts/toast-context"
import { useAuth } from "@clerk/nextjs"
import type { CaseDetail } from "@/lib/api"
import { useNavigationLoader } from "@/hooks/use-navigation-loader"
import { SimpleLoader } from "@/components/ui/simple-loader"
import { closeCase } from "@/lib/actions/case-actions"

interface StatusChangeDialogProps {
  caseId: string
  currentStatus: string
  onStatusChange: (patch?: Partial<CaseDetail>) => void
  children: React.ReactNode
}

export function StatusChangeDialog({ 
  caseId, 
  currentStatus, 
  onStatusChange, 
  children 
}: StatusChangeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reunited, setReunited] = useState(true)
  const { showSuccess, showError } = useToast()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { startLoading, stopLoading, isLoading: isNavLoading } = useNavigationLoader()

  const MIN_REASON_LENGTH = 10
  const MAX_REASON_LENGTH = 200

  const handleStatusChange = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for closing this case')
      return
    }

    if (reason.trim().length < MIN_REASON_LENGTH) {
      setError(`Please provide at least ${MIN_REASON_LENGTH} characters for the reason`)
      return
    }

    if (reason.trim().length > MAX_REASON_LENGTH) {
      setError(`Reason must be no more than ${MAX_REASON_LENGTH} characters`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use server action (industry standard)
      const result = await closeCase(caseId, reason.trim(), reunited)
      
      if (result.success) {
        showSuccess('Case closed successfully', 'Case marked as closed and removed from search results.')
        // Start simple loader overlay for smooth transition until SSR refresh completes
        startLoading({ expectRouteChange: false })
        
        // Close dialog and refresh data
        setIsOpen(false)
        setReason('')
        setReunited(true)
        onStatusChange(result?.data ?? { status: 'closed', caseClosingDate: new Date().toISOString() })
      }
    } catch (error) {
      console.error('Error closing case:', error)
      setError(error instanceof Error ? error.message : 'Failed to close case')
      showError('Failed to close case', error instanceof Error ? error.message : 'Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setReason('')
      setError(null)
      setReunited(true)
    }
    if (open) {
      setReunited(true)
    }
    setIsOpen(open)
  }

  const isDisabled = currentStatus === 'closed' || isLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent
        className="
          w-[95vw] max-w-[480px]
          mx-auto my-auto
          p-0
          overflow-hidden
          flex flex-col
          bg-white/95 dark:bg-gray-900/95
          backdrop-blur-xl
          border-0
          shadow-2xl
          rounded-2xl
          max-h-[85vh]
        "
      >
        {isNavLoading && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <SimpleLoader />
          </div>
        )}
        <DialogHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-2 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
          <DialogTitle className="flex items-center gap-2 break-words text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Close Case
          </DialogTitle>
          <DialogDescription className="break-words whitespace-normal text-left leading-relaxed text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to close this case? This action cannot be undone and the case will no longer appear in search results.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 py-2 sm:py-3 space-y-2 sm:space-y-3">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for closing *
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for closing this case (e.g., Person found, Case resolved, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full resize-none text-sm leading-relaxed p-3 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 rounded-lg overflow-y-auto break-words whitespace-pre-wrap"
              style={{ boxSizing: 'border-box', wordWrap: 'break-word', overflowWrap: 'break-word', height: '120px', maxHeight: '120px', minHeight: '120px' }}
              disabled={isLoading}
              maxLength={MAX_REASON_LENGTH}
            />
            <div className="flex justify-between items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 w-full mt-2">
              <span>{reason.length}/{MAX_REASON_LENGTH} characters</span>
              {reason.length > 0 && reason.length < MIN_REASON_LENGTH && (
                <span className="text-amber-600 break-words">
                  {MIN_REASON_LENGTH - reason.length} more characters needed
                </span>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg break-words">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          {/* Family reunited opt-in */}
          <div className="flex items-start gap-2 rounded-lg p-3 border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30">
            <input
              id="reunited"
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-emerald-600"
              checked={reunited}
              onChange={(e) => setReunited(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="reunited" className="text-sm text-foreground/90">
              Mark as family reunited
            </label>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200 break-words whitespace-pre-wrap min-w-0">
                <p className="font-medium mb-2">Important:</p>
                <div className="space-y-1 text-xs break-words whitespace-pre-wrap">
                  <p className="break-words whitespace-pre-wrap">This case will be hidden from public search</p>
                  <p className="break-words whitespace-pre-wrap">The case will no longer appear in your profile</p>
                  <p className="break-words whitespace-pre-wrap">This action cannot be undone</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 sm:space-x-3 pt-3 sm:pt-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="min-w-[80px] sm:min-w-[100px] h-10 sm:h-11 text-sm font-medium px-4 sm:px-6 cursor-pointer border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={!reason.trim() || reason.trim().length < MIN_REASON_LENGTH || isLoading}
              className="min-w-[80px] sm:min-w-[100px] h-10 sm:h-11 text-sm font-medium px-4 sm:px-6 cursor-pointer bg-red-600 hover:bg-red-700 text-white transition-all duration-150 hover:shadow-sm disabled:bg-muted disabled:text-muted-foreground relative"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Close Case
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
