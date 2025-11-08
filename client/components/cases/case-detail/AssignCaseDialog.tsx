'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { UserPlus, Loader2, Search, AlertTriangle, CheckCircle2, ChevronRight, User, X } from "lucide-react"
import { useToast } from "@/contexts/toast-context"
import { useAuth } from "@clerk/nextjs"
import { assignCase } from "@/lib/actions/case-actions"

interface AssignCaseDialogProps {
  caseId: string
  onAssigned?: () => void
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface UserSearchResult {
  clerkUserId: string
  fullName: string
  email: string
  phoneNumber?: string
  age?: number
  gender?: string
}

export function AssignCaseDialog({ 
  caseId, 
  onAssigned,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: AssignCaseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = controlledOnOpenChange || setInternalOpen
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()
  const { getToken } = useAuth()

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([])
      setSelectedUser(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      await performUserSearch(searchQuery.trim())
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const performUserSearch = useCallback(async (query: string) => {
    setIsSearching(true)
    setError(null)
    
    try {
      const token = await getToken()
      if (!token) {
        setError('Authentication required')
        setIsSearching(false)
        return
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        setError('Backend URL not configured')
        setIsSearching(false)
        return
      }

      const url = new URL(`${backendUrl}/api/users/search`)
      url.searchParams.append('query', query)

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setError(error instanceof Error ? error.message : 'Failed to search users')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [getToken])

  const handleAssignCase = async () => {
    if (!selectedUser) {
      setError('Please select a user to assign the case to')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await assignCase(caseId, selectedUser.clerkUserId)
      
      if (result.success) {
        const userName = selectedUser.fullName || 'the selected user'
        const shortName = userName.length > 30 ? `${userName.substring(0, 27)}...` : userName
        showSuccess('Case assigned successfully', `Assigned to ${shortName}.`)
        setIsOpen(false)
        setSelectedUser(null)
        setSearchQuery('')
        setSearchResults([])
        onAssigned?.()
      } else {
        setError(result.message)
        showError('Failed to assign case', result.message)
      }
    } catch (error) {
      console.error('Error assigning case:', error)
      setError(error instanceof Error ? error.message : 'Failed to assign case')
      showError('Failed to assign case', error instanceof Error ? error.message : 'Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setSelectedUser(null)
      setSearchQuery('')
      setSearchResults([])
      setError(null)
    }
    setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent
        showCloseButton={false}
        className="
          w-[95vw] max-w-[600px]
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
            <UserPlus className="h-5 w-5 text-blue-500" />
            Assign Case to User
          </DialogTitle>
          <DialogDescription className="break-words whitespace-normal text-left leading-relaxed text-sm text-gray-600 dark:text-gray-400">
            Search for a user by name, email, or phone number to assign this case.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 py-2 sm:py-3 space-y-3 sm:space-y-4 overflow-y-auto">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="user-search" className="text-sm font-medium">
              Search User *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="user-search"
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
                className="pl-9 pr-3"
              />
            </div>
            {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Type at least 3 characters to search
              </p>
            )}
          </div>

          {/* Search Results */}
          {isSearching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!isSearching && searchQuery.trim().length >= 3 && searchResults.length === 0 && !selectedUser && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No users found. Try searching by name, email, or phone number.
            </div>
          )}

          {/* Show search results only when no user is selected */}
          {!isSearching && searchResults.length > 0 && !selectedUser && (
            <div className="space-y-0 max-h-[240px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {searchResults.map((user, idx) => (
                <button
                  key={user.clerkUserId}
                  onClick={() => setSelectedUser(user)}
                  disabled={isLoading}
                  className={`
                    w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150
                    hover:bg-accent/50 focus:bg-accent focus:outline-none
                    ${idx > 0 ? 'border-t border-border/50' : ''}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex-1 min-w-0 space-y-1.5 overflow-hidden">
                    {/* Name row with badge */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate min-w-0 flex-1" title={user.fullName || 'Unknown User'}>
                        {user.fullName || 'Unknown User'}
                      </span>
                      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
                        User
                      </span>
                    </div>
                    
                    {/* Details row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0">
                      {user.email && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 min-w-0 max-w-[calc(100%-8px)] overflow-hidden" title={user.email}>
                          <span className="truncate block">{user.email}</span>
                        </span>
                      )}
                      {user.phoneNumber && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 min-w-0 max-w-[calc(100%-8px)] overflow-hidden" title={user.phoneNumber}>
                          <span className="truncate block">{user.phoneNumber}</span>
                        </span>
                      )}
                      {user.age !== undefined && user.age !== null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 shrink-0 whitespace-nowrap">
                          {user.age} years
                        </span>
                      )}
                      {user.gender && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 capitalize shrink-0 whitespace-nowrap">
                          {String(user.gender)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          )}

          {/* Show selected user only (when selected) */}
          {selectedUser && (
            <div className="space-y-0 border border-primary/20 rounded-lg bg-primary/5 shadow-sm">
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1.5 overflow-hidden">
                  {/* Name row with badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate min-w-0 flex-1" title={selectedUser.fullName || 'Unknown User'}>
                      {selectedUser.fullName || 'Unknown User'}
                    </span>
                    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
                      User
                    </span>
                  </div>
                  
                  {/* Details row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0">
                    {selectedUser.email && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 min-w-0 max-w-[calc(100%-8px)] overflow-hidden" title={selectedUser.email}>
                        <span className="truncate block">{selectedUser.email}</span>
                      </span>
                    )}
                    {selectedUser.phoneNumber && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 min-w-0 max-w-[calc(100%-8px)] overflow-hidden" title={selectedUser.phoneNumber}>
                        <span className="truncate block">{selectedUser.phoneNumber}</span>
                      </span>
                    )}
                    {selectedUser.age !== undefined && selectedUser.age !== null && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 shrink-0 whitespace-nowrap">
                        {selectedUser.age} years
                      </span>
                    )}
                    {selectedUser.gender && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70 capitalize shrink-0 whitespace-nowrap">
                        {String(selectedUser.gender)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                  aria-label="Clear selection"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

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
              onClick={handleAssignCase}
              disabled={!selectedUser || isLoading}
              className="min-w-[80px] sm:min-w-[100px] h-10 sm:h-11 text-sm font-medium px-4 sm:px-6 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150 hover:shadow-sm disabled:bg-muted disabled:text-muted-foreground relative"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Case
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

