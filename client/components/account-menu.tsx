'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useUser, useClerk, useReverification } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SimpleLoader } from '@/components/ui/simple-loader'
import { createPortal } from 'react-dom'
import { useNavigationLoader } from '@/hooks/use-navigation-loader'

export function AccountMenu() {
    const router = useRouter()
    const pathname = usePathname()
    const { user, isSignedIn } = useUser()
    const { signOut, client, openUserProfile } = useClerk()
    const [isManageOpen, setIsManageOpen] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState<'profile' | 'security'>('profile')
    const [mounted, setMounted] = React.useState(false)
    const { isLoading, startLoading } = useNavigationLoader()
    const [showPhotoCard, setShowPhotoCard] = React.useState(false)
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
    const [isRemoving, setIsRemoving] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement | null>(null)
    const [showPasswordCard, setShowPasswordCard] = React.useState(false)
    const [requiresCurrentPassword, setRequiresCurrentPassword] = React.useState(false)
    const [currentPassword, setCurrentPassword] = React.useState('')
    const [newPassword, setNewPassword] = React.useState('')
    const [confirmPassword, setConfirmPassword] = React.useState('')
    const [passwordSaving, setPasswordSaving] = React.useState(false)
    const [passwordError, setPasswordError] = React.useState<string | null>(null)
    const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null)
    const [signOutAll, setSignOutAll] = React.useState(true)
    const isTooShort = newPassword.length > 0 && newPassword.length < 8
    const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const handleProfileClick = () => {
        if (pathname === '/profile') {
            return
        }
        startLoading()
        router.push('/profile')
    }
    const isPasswordValid = newPassword.length >= 8 && newPassword === confirmPassword
    const performPasswordUpdate = useReverification(async () => {
        const anyUser = user as unknown as { updatePassword?: (args: { newPassword: string; signOutOfOtherSessions?: boolean; currentPassword?: string }) => Promise<void> }
        if (!anyUser?.updatePassword) throw new Error('Password update not available')
        await anyUser.updatePassword({ newPassword, signOutOfOtherSessions: signOutAll, currentPassword: requiresCurrentPassword && currentPassword ? currentPassword : undefined })
    })
    

    // Root-cause fix: freeze scroll without changing layout width
    // We avoid toggling overflow on body (which removes the scrollbar gutter)
    // and instead use position: fixed to lock the scroll and restore it on close
    React.useEffect(() => {
        const body = document.body
        let previousScrollY = 0
        if (isManageOpen) {
            previousScrollY = window.scrollY
            body.style.position = 'fixed'
            body.style.top = `-${previousScrollY}px`
            body.style.width = '100%'
        } else {
            const top = body.style.top
            body.style.position = ''
            body.style.top = ''
            body.style.width = ''
            if (top) {
                const y = parseInt(top.replace('px', ''))
                if (!Number.isNaN(y)) {
                    window.scrollTo(0, -y)
                }
            }
        }
        return () => {
            const top = body.style.top
            body.style.position = ''
            body.style.top = ''
            body.style.width = ''
            if (top) {
                const y = parseInt(top.replace('px', ''))
                if (!Number.isNaN(y)) {
                    window.scrollTo(0, -y)
                }
            }
        }
    }, [isManageOpen])

    if (!isSignedIn) return null

    const avatar = user?.imageUrl || ''
    const displayName = user?.fullName || user?.username || 'Account'
    const email = user?.primaryEmailAddress?.emailAddress || ''
    const isVolunteer = (user?.publicMetadata as any)?.role === 'volunteer'

    const formatLastActive = (input: any) => {
        if (!input) return '—'
        const d = new Date(input)
        if (Number.isNaN(d.getTime())) return '—'
        const now = new Date()
        const isToday = d.toDateString() === now.toDateString()
        const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        if (isToday) return `Today at ${time}`
        const y = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
        return `${y} at ${time}`
    }

    

    return (
        <>
            {/* Full Screen Loader with Background Blur (Portal to body) */}
            {mounted && isLoading && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
                    <SimpleLoader />
                </div>,
                document.body
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-200 ease-out focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                        style={{ outline: 'none', boxShadow: 'none' }}
                    >
                        {avatar ? (
                            <Image src={avatar} alt="avatar" width={32} height={32} className="rounded-full" />
                        ) : (
                            <span className="text-xs font-semibold">{displayName.charAt(0)}</span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-64">
                    <DropdownMenuLabel className="flex flex-col">
                        <span className="font-medium truncate">{displayName}</span>
                        {email ? <span className="text-xs text-muted-foreground truncate">{email}</span> : null}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isVolunteer ? (
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                                if (pathname === '/volunteer') return
                                startLoading()
                                router.push('/volunteer')
                            }}
                        >
                            Dashboard
                        </DropdownMenuItem>
                    ) : null}
                    {isVolunteer ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem className="cursor-pointer" onClick={handleProfileClick}>
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsManageOpen(true)} className="cursor-pointer">Manage account</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={async () => {
                            await signOut()
                            router.push('/')
                        }}
                    >
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {isManageOpen ? (
                <div className="fixed inset-0 z-[100]">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsManageOpen(false)} />
                    <div className="relative z-[101] flex min-h-full items-center justify-center p-4">
                        <div role="dialog" aria-modal="true" className="w-full max-w-4xl rounded-xl border bg-background shadow-2xl">
                            <div className="flex h-[70vh]">
                                <aside className="hidden w-60 shrink-0 border-r bg-muted/30 p-4 md:block">
                                    <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Settings</h2>
                                    <nav className="flex flex-col gap-1">
                                        <button
                                            className={`text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 cursor-pointer ${activeTab === 'profile' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                                            onClick={() => setActiveTab('profile')}
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Profile
                                        </button>
                                        <button
                                            className={`text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 cursor-pointer ${activeTab === 'security' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                                            onClick={() => setActiveTab('security')}
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Security
                                        </button>
                                    </nav>
                                </aside>
                                <section className="flex-1 overflow-y-auto">
                                    <header className="flex items-center justify-between border-b px-4 py-3">
                                        <div>
                                            <h1 className="text-base font-semibold">Manage account</h1>
                                            <p className="text-sm text-muted-foreground">Update your account settings</p>
                                        </div>
                                        <button onClick={() => setIsManageOpen(false)} className="h-8 w-8 rounded-md border hover:bg-muted cursor-pointer">✕</button>
                                    </header>
                                    <div className="p-4 md:p-6">
                                        {activeTab === 'profile' ? (
                                            <div className="space-y-4">
                                                <h2 className="text-sm font-semibold">Profile details</h2>

                                                <div className="rounded-lg border p-4">
                                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr] md:gap-6">
                                                        <div className="text-sm text-muted-foreground">Profile</div>
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <div className="h-16 w-16 overflow-hidden rounded-full border">
                                                                {avatar ? (
                                                                    <Image src={avatar} alt="avatar" width={64} height={64} className="h-16 w-16 object-cover" />
                                                                ) : (
                                                                    <div className="flex h-16 w-16 items-center justify-center text-sm font-semibold">{displayName.charAt(0)}</div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-[140px] text-sm">
                                                                <div className="font-medium leading-none">{displayName}</div>
                                                                {user?.username ? (
                                                                    <div className="mt-1 text-muted-foreground">@{user.username}</div>
                                                                ) : null}
                                                            </div>
                                                            <div className="ml-auto">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer"
                                                                    onClick={() => {
                                                                        setShowPhotoCard(true)
                                                                        setIsRemoving(false)
                                                                        setErrorMsg(null)
                                                                    }}
                                                                >
                                                                    Update photo
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {showPhotoCard ? (
                                                    <div className="rounded-lg border p-4">
                                                        <h3 className="text-sm font-medium">Upload photo</h3>
                                                        <div className="mt-4 flex flex-wrap items-center gap-4">
                                                            <div className="h-20 w-20 overflow-hidden rounded-full border">
                                                                {previewUrl ? (
                                                                    <Image src={previewUrl} alt="preview" width={80} height={80} className="h-20 w-20 object-cover" />
                                                                ) : avatar ? (
                                                                    <Image src={avatar} alt="avatar" width={80} height={80} className="h-20 w-20 object-cover" />
                                                                ) : (
                                                                    <div className="flex h-20 w-20 items-center justify-center text-sm font-semibold">{displayName.charAt(0)}</div>
                                                                )}
                                                            </div>
                                                            <div className="space-x-2">
                                                                <input
                                                                    ref={fileInputRef}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files && e.target.files[0]
                                                                        if (!file) return
                                                                        if (file.size > 10 * 1024 * 1024) {
                                                                            setErrorMsg('File must be up to 10MB')
                                                                            return
                                                                        }
                                                                        setSelectedFile(file)
                                                                        setIsRemoving(false)
                                                                        setErrorMsg(null)
                                                                        const url = URL.createObjectURL(file)
                                                                        setPreviewUrl(url)
                                                                    }}
                                                                />
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="cursor-pointer"
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                >
                                                                    Update photo
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-muted-foreground cursor-pointer"
                                                                    onClick={() => {
                                                                        setErrorMsg(null)
                                                                        setIsSaving(true)
                                                                        setSelectedFile(null)
                                                                        setPreviewUrl(null)
                                                                        ;(async () => {
                                                                            try {
                                                                                const anyUser = user as unknown as { removeProfileImage?: () => Promise<void>; deleteProfileImage?: () => Promise<void>; setProfileImage?: (args: any) => Promise<any> }
                                                                                if (anyUser?.removeProfileImage) {
                                                                                    await anyUser.removeProfileImage()
                                                                                } else if (anyUser?.deleteProfileImage) {
                                                                                    await anyUser.deleteProfileImage()
                                                                                } else if (anyUser?.setProfileImage) {
                                                                                    await anyUser.setProfileImage({ file: null })
                                                                                } else {
                                                                                    throw new Error('Remove profile image not supported in this SDK version')
                                                                                }
                                                                                setShowPhotoCard(false)
                                                                                setIsRemoving(false)
                                                                                setIsSaving(false)
                                                                                router.refresh?.()
                                                                            } catch (err: any) {
                                                                                setIsSaving(false)
                                                                                setErrorMsg(err?.message || 'Failed to remove photo')
                                                                            }
                                                                        })()
                                                                    }}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <p className="mt-3 text-xs text-muted-foreground">Recommended size 1:1, up to 10MB.</p>
                                                        {errorMsg ? (
                                                            <p className="mt-2 text-xs text-red-600">{errorMsg}</p>
                                                        ) : null}
                                                        <div className="mt-4 flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="cursor-pointer"
                                                                onClick={() => {
                                                                    setShowPhotoCard(false)
                                                                    setSelectedFile(null)
                                                                    setPreviewUrl(null)
                                                                    setIsRemoving(false)
                                                                    setErrorMsg(null)
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="cursor-pointer"
                                                                disabled={isSaving || !selectedFile}
                                                                onClick={async () => {
                                                                    try {
                                                                        setIsSaving(true)
                                                                        setErrorMsg(null)
                                                                        if (selectedFile) {
                                                                            const anyUser = user as unknown as { setProfileImage?: (args: { file: File }) => Promise<any> }
                                                                            if (!anyUser?.setProfileImage) throw new Error('Profile image update not available')
                                                                            await anyUser.setProfileImage({ file: selectedFile })
                                                                        }
                                                                        setShowPhotoCard(false)
                                                                        setSelectedFile(null)
                                                                        setPreviewUrl(null)
                                                                        router.refresh?.()
                                                                    } catch (err: any) {
                                                                        setErrorMsg(err?.message || 'Failed to update photo')
                                                                    } finally {
                                                                        setIsSaving(false)
                                                                    }
                                                                }}
                                                            >
                                                                {isSaving ? 'Saving...' : 'Save'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div className="rounded-lg border p-4">
                                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr] md:gap-6">
                                                        <div className="text-sm text-muted-foreground">Email address</div>
                                                        <div className="text-sm">
                                                            <div className="font-medium leading-none">{email || '—'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border p-4">
                                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr] md:gap-6">
                                                        <div className="text-sm text-muted-foreground">Connected accounts</div>
                                                        <div className="flex items-center gap-3 text-sm">
                                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border">
                                                                <svg aria-hidden="true" viewBox="0 0 48 48" width="14" height="14">
                                                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.23 9.21 3.25l6.9-6.9C35.9 2.36 30.29 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.04 6.24C12.24 13.02 17.59 9.5 24 9.5z"/>
                                                                    <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.43-4.75H24v9h12.7c-.55 2.95-2.2 5.45-4.7 7.14l7.18 5.58C43.94 37.09 46.5 31 46.5 24z"/>
                                                                    <path fill="#FBBC05" d="M10.6 19.46l-8.04-6.24C.96 16.83 0 20.29 0 24c0 3.71.96 7.17 2.56 10.78l8.04-6.24C9.96 27.09 9.5 25.59 9.5 24s.46-3.09 1.1-4.54z"/>
                                                                    <path fill="#34A853" d="M24 48c6.29 0 11.9-2.06 15.89-5.58l-7.18-5.58c-2.01 1.35-4.58 2.16-8.71 2.16-6.41 0-11.76-3.52-13.4-10.01l-8.04 6.24C6.51 42.62 14.62 48 24 48z"/>
                                                                    <path fill="none" d="M0 0h48v48H0z"/>
                                                                </svg>
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium leading-none">Google</span>
                                                                <span className="text-muted-foreground">·</span>
                                                                <span className="text-muted-foreground">{email || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}

                                        {activeTab === 'security' ? (
                                            <div className="space-y-6">
                                                <section>
                                                    <h3 className="text-sm font-medium">Security</h3>
                                                    <p className="text-sm text-muted-foreground">Manage password and sessions</p>
                                                    <div className="mt-4 space-y-4">
                                                        <div className="rounded-lg border p-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm font-medium">Password</p>
                                                                    <p className="text-sm text-muted-foreground">Change your account password</p>
                                                                </div>
                                                                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setShowPasswordCard(true); setPasswordError(null); setPasswordSuccess(null) }}>Update</Button>
                                                            </div>
                                                            {showPasswordCard ? (
                                                                <div className="mt-4 border-t pt-4">
                                                                    <div className="grid gap-4 md:grid-cols-2">
                                                                        {requiresCurrentPassword ? (
                                                                            <div className="md:col-span-2">
                                                                                <label className="mb-1 block text-sm text-muted-foreground">Current password</label>
                                                                                <input type="password" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                                                                <p className="mt-1 text-xs text-muted-foreground">You need to provide additional verification.</p>
                                                                            </div>
                                                                        ) : null}
                                                                        <div>
                                                                            <label className="mb-1 block text-sm text-muted-foreground">New password</label>
                                                                            <input type="password" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                                                            {isTooShort ? <p className="mt-1 text-xs text-red-600">Password must contain 8 or more characters.</p> : null}
                                                                        </div>
                                                                        <div>
                                                                            <label className="mb-1 block text-sm text-muted-foreground">Confirm new password</label>
                                                                            <input type="password" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                                                            {isMismatch ? <p className="mt-1 text-xs text-red-600">Passwords don’t match.</p> : null}
                                                                        </div>
                                                                    </div>
                                                                    <label className="mt-3 flex items-center gap-2 text-sm">
                                                                        <input type="checkbox" className="h-4 w-4" checked={signOutAll} onChange={(e) => setSignOutAll(e.target.checked)} />
                                                                        <span>Sign out of all devices</span>
                                                                    </label>
                                                                    {passwordError ? <p className="mt-2 text-xs text-red-600">{passwordError}</p> : null}

                                                                    <div className="mt-4 flex justify-end gap-2">
                                                                        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => { setShowPasswordCard(false); setNewPassword(''); setConfirmPassword(''); setPasswordError(null); setPasswordSuccess(null); setSignOutAll(true); setRequiresCurrentPassword(false); setCurrentPassword('') }}>Cancel</Button>
                                                                        <Button
                                                                            variant="default"
                                                                            size="sm"
                                                                            className="cursor-pointer"
                                                                            disabled={passwordSaving || !isPasswordValid}
                                                                            onClick={async () => {
                                                                                try {
                                                                                    setPasswordSaving(true)
                                                                                    setPasswordError(null)
                                                                                    setPasswordSuccess(null)
                                                                                    if (newPassword.length < 8) {
                                                                                        throw new Error('Password must contain 8 or more characters.')
                                                                                    }
                                                                                    if (newPassword !== confirmPassword) {
                                                                                        throw new Error("Passwords don't match.")
                                                                                    }
                                                                                    await performPasswordUpdate()
                                                                                    setPasswordSuccess('Password updated successfully')
                                                                                    setShowPasswordCard(false)
                                                                                    setNewPassword('')
                                                                                    setConfirmPassword('')
                                                                                    setSignOutAll(true)
                                                                                    setRequiresCurrentPassword(false)
                                                                                    setCurrentPassword('')
                                                                                } catch (err: any) {
                                                                                    setPasswordError(err?.message || 'Failed to update password')
                                                                                } finally {
                                                                                    setPasswordSaving(false)
                                                                                }
                                                                            }}
                                                                        >
                                                                            {passwordSaving ? 'Saving...' : 'Save'}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        
                                                    </div>
                                                </section>
                                            </div>
                                        ) : null}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}


