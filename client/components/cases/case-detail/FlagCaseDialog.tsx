'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Flag, Loader2 } from "lucide-react"
import { useToast } from "@/contexts/toast-context"
import { flagCase } from "@/lib/actions/case-actions"

interface FlagCaseDialogProps {
  caseId: string
  onFlagged?: () => void
  children: React.ReactNode
}

const FLAG_REASONS = [
  "Inappropriate content",
  "Spam/Fake case", 
  "Privacy violation",
  "Harassment/Bullying",
  "Misinformation"
]

export function FlagCaseDialog({ 
  caseId, 
  onFlagged,
  children 
}: FlagCaseDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()

  const handleFlagCase = async () => {
    if (!selectedReason) {
      setError('Please select a reason for flagging this case')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await flagCase(caseId, selectedReason)
      
      if (result.success) {
        showSuccess('Case flagged successfully', 'Thank you for helping maintain quality.')
        setIsOpen(false)
        setSelectedReason('')
        onFlagged?.()
      } else {
        // Check if it's a duplicate flag error
        if (result.message.includes('already flagged')) {
          showSuccess('Case already flagged', 'You have already reported this case. Thank you for your concern!')
          setIsOpen(false)
          setSelectedReason('')
        } else {
          setError(result.message)
          showError('Failed to flag case', result.message)
        }
      }
    } catch (error) {
      console.error('Error flagging case:', error)
      setError(error instanceof Error ? error.message : 'Failed to flag case')
      showError('Failed to flag case', error instanceof Error ? error.message : 'Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setSelectedReason('')
      setError(null)
    }
    setIsOpen(open)
  }

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
        <DialogHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-2 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
          <DialogTitle className="flex items-center gap-2 break-words text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            <Flag className="h-5 w-5 text-red-500" />
            Flag Case
          </DialogTitle>
          <DialogDescription className="break-words whitespace-normal text-left leading-relaxed text-sm text-gray-600 dark:text-gray-400">
            Help us maintain quality by reporting cases that violate our guidelines.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 py-2 sm:py-3 space-y-2 sm:space-y-3">
          <div className="space-y-3 min-w-0">
            <Label className="text-sm font-medium">
              Reason for flagging *
            </Label>
            <div className="space-y-2">
              {FLAG_REASONS.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="flagReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={isLoading}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {reason}
                  </span>
                </label>
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg break-words">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            )}
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
              onClick={handleFlagCase}
              disabled={!selectedReason || isLoading}
              className="min-w-[80px] sm:min-w-[100px] h-10 sm:h-11 text-sm font-medium px-4 sm:px-6 cursor-pointer bg-red-600 hover:bg-red-700 text-white transition-all duration-150 hover:shadow-sm disabled:bg-muted disabled:text-muted-foreground relative"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Flagging...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Flag Case
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
