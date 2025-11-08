'use client'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Menu, X, Plus, CupSoda, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SignedIn, SignedOut, useAuth } from '@clerk/nextjs'
import { AccountMenu } from '@/components/account-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import NotificationsPopover from '@/components/notifications/NotificationsPopover'
import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useNavigationLoader } from '@/hooks/use-navigation-loader'
import { createPortal } from 'react-dom'
import { SimpleLoader } from '@/components/ui/simple-loader'
import { useNotificationsStore } from '@/providers/notifications-store-provider'

export function Navbar() {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const expandedContainerRef = React.useRef<HTMLDivElement | null>(null)
	const [expandedHeight, setExpandedHeight] = React.useState(0)
	const EXPANDED_MARGIN_COMP = 20 // px to compensate internal margins (divider my-2 + row mb-3)
const router = useRouter()
const pathname = usePathname()
const searchParams = useSearchParams()
const { isLoading, mounted, startLoading, stopLoading } = useNavigationLoader()

const stopAfterNextPaint = React.useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => stopLoading()))
}, [stopLoading])

const handleButtonClick = React.useCallback((href: string) => {
    const isSameRoute = pathname === href
    const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')
    const goingToRegisterCase = href === '/register-case'
    const goingToSignIn = href === '/sign-in'
    const currentReturnTo = searchParams?.get('returnTo') || searchParams?.get('returnBackUrl') || searchParams?.get('redirect_url')
    const hasReturnParam = Boolean(currentReturnTo)
    const alreadyOnAuthWithReturnToRegister = isAuthPage && goingToRegisterCase && currentReturnTo === '/register-case'

    let treatAsSameRoute = isSameRoute || alreadyOnAuthWithReturnToRegister
    if (pathname === '/sign-in' && goingToSignIn && hasReturnParam) {
        treatAsSameRoute = false
    }

    startLoading({ expectRouteChange: !treatAsSameRoute })
    if (treatAsSameRoute) {
        stopAfterNextPaint()
        return
    }
    router.push(href)
}, [pathname, router, searchParams, startLoading, stopAfterNextPaint])

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Popover handles its own open state
    const notifications = useNotificationsStore(s => s.notifications)
    const unreadCount = useNotificationsStore(s => s.unreadCount)
    const enqueueRead = useNotificationsStore(s => s.enqueueRead)
    const flushPendingReads = useNotificationsStore(s => s.flushPendingReads)
    const markAllReadOptimistic = useNotificationsStore(s => s.markAllReadOptimistic)
    const setLastSeenAt = useNotificationsStore(s => s.setLastSeenAt)
    const { getToken } = useAuth()

    React.useEffect(() => {
        const measure = () => {
            if (menuState && expandedContainerRef.current) {
                setExpandedHeight(expandedContainerRef.current.offsetHeight)
            } else {
                setExpandedHeight(0)
            }
        }
        // Measure after DOM updates
        requestAnimationFrame(measure)
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [menuState])

    return (
        <header>
            {/* Full Screen Loader with Background Blur (Portal to body) */}
            {isLoading && mounted && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70">
                    <SimpleLoader />
                </div>,
                document.body
            )}
            <nav
                data-state={menuState && 'active'}
                className={cn("fixed z-50 w-full px-2", !isScrolled && "border-b border-border/100")}>
                <div className={cn(
                    'mx-auto mt-2 w-full md:max-w-none lg:max-w-screen-2xl px-3 sm:px-4 md:px-2 lg:px-3 xl:px-4 border',
                    isScrolled ? 'bg-background/50 rounded-2xl backdrop-blur-lg' : 'border-transparent'
                )}>
                    {/* Main navbar content */}
                    <div className="relative flex items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                        <div className="flex items-center">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2"
                                onClick={(e) => {
                                    startLoading({ expectRouteChange: pathname !== '/' })
                                    if (pathname === '/') {
                                        stopAfterNextPaint()
                                    }
                                }}>
                                <Logo />
                            </Link>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Mobile actions */}
                            <div className="lg:hidden flex items-center gap-3">
                            {/* Primary action - always visible */}
                            <Button 
                                onClick={() => handleButtonClick('/register-case')}
                                disabled={isLoading}
                                className="flex items-center gap-1.5 transition-all duration-300 font-semibold shadow-md hover:shadow-lg hover:opacity-90 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg px-3 py-2 h-9 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="text-sm">Report</span>
                            </Button>

                                {/* Essential actions - always visible */}
                                <div className="flex items-center gap-3">
                                    <SignedIn>
                                        <AccountMenu />
                                    </SignedIn>
                                    <SignedOut>
                                        <Button 
                                            onClick={() => handleButtonClick('/sign-in')}
                                            disabled={isLoading}
                                            variant="outline" 
                                            className="h-9 px-4 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            Sign in
                                        </Button>
                                    </SignedOut>
                                </div>

                                <button
                                    onClick={() => setMenuState(!menuState)}
                                    aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                    className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5">
                                    <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                    <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                                </button>
                            </div>
                        </div>

                        {/* Desktop actions */}
                        <div className="hidden lg:flex items-center gap-3 lg:gap-4">
                            {/* Primary actions */}
                            <Button 
                                onClick={() => handleButtonClick('/register-case')}
                                disabled={isLoading}
                                className="flex items-center gap-2 font-semibold shadow-md hover:shadow-lg hover:opacity-90 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg px-4 py-2 h-10 cursor-pointer transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden md:inline">Report Case</span>
                                <span className="md:hidden">Report</span>
                            </Button>
                            {/* Mobile buttons - always visible */}
						<Link href="/donate" className="cursor-pointer" onClick={() => startLoading({ expectRouteChange: pathname !== '/donate' })}>
                                <Button variant="outline" size="icon" className="h-9 w-9 cursor-pointer hover:bg-accent hover:text-accent-foreground hover:shadow-lg transition-all duration-300 ease-in-out group" aria-label="Buy me a coffee">
                                    <CupSoda className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                                </Button>
                            </Link>

                            <SignedIn>
                                {/* Notifications Drawer trigger */}
                                <NotificationsPopover />

                                {/* Profile */}
                                <AccountMenu />
                            </SignedIn>

                            <SignedOut>
                                <Button 
                                    onClick={() => handleButtonClick('/sign-in')}
                                    disabled={isLoading}
                                    variant="outline" 
                                    className="h-10 px-4 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    Sign in
                                </Button>
                            </SignedOut>

                            <ThemeToggle />
                        </div>

                    </div>

					{/* Mobile expanded content wrapper inside nav for measurement */}
					<div ref={expandedContainerRef} className="in-data-[state=active]:block hidden lg:hidden">
						{/* Subtle divider */}
						<div className="h-px w-full bg-border/60 my-2" />
						{/* Centered actions */}
						<div className="w-full items-center justify-center gap-4 mb-3 flex">
                        <Link href="/donate" className="cursor-pointer" onClick={() => { setMenuState(false); startLoading({ expectRouteChange: pathname !== '/donate' }) }}>
								<Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer hover:bg-accent hover:text-accent-foreground hover:shadow-lg transition-all duration-300 ease-in-out group" aria-label="Buy me a coffee">
									<CupSoda className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
								</Button>
							</Link>

                            <SignedIn>
                                <NotificationsPopover />
                            </SignedIn>

							<ThemeToggle />
						</div>
					</div>
				</div>
			</nav>
			{/* Spacer to push page content when expanded, without altering navbar design */}
			<div className="lg:hidden" style={{ height: menuState ? expandedHeight + EXPANDED_MARGIN_COMP : 0 }} />
		</header>
    )
}