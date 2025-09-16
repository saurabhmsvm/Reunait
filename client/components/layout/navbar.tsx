'use client'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Menu, X, Plus, Bell, CupSoda, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import { AccountMenu } from '@/components/account-menu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LocationService } from '@/lib/location'
import React from 'react'
import { cn } from '@/lib/utils'

export function Navbar() {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [savedLocation, setSavedLocation] = React.useState<{ city: string; state: string } | null>(null)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    React.useEffect(() => {
        const loc = LocationService.getSavedLocation?.()
        if (loc) setSavedLocation(loc)
    }, [])

    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className={cn("fixed z-50 w-full px-2", !isScrolled && "border-b border-border/100")}>
                <div className={cn('mx-auto mt-2 w-full md:max-w-none lg:max-w-screen-2xl px-3 sm:px-4 md:px-2 lg:px-3 xl:px-4 transition-all duration-300 bg-background/50 backdrop-blur-lg', isScrolled && 'max-w-4xl rounded-2xl border lg:px-5')}>
                    {/* Main navbar content */}
                    <div className="relative flex items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                        <div className="flex items-center">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2">
                                <Logo />
                            </Link>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Mobile actions */}
                            <div className="lg:hidden flex items-center gap-3">
                                {/* Primary action - always visible */}
                                <Link href="/register-case" className="cursor-pointer">
                                    <Button className="flex items-center gap-1.5 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg px-3 py-2 h-9 cursor-pointer">
                                        <Plus className="h-4 w-4" />
                                        <span className="text-sm">Report</span>
                                    </Button>
                                </Link>
                                
                                {/* Essential actions - always visible */}
                                <div className="flex items-center gap-3">
                                    <SignedIn>
                                        <AccountMenu />
                                    </SignedIn>
                                    <SignedOut>
                                        <Link href="/sign-in" className="cursor-pointer">
                                            <Button variant="outline" className="h-9 px-4 text-sm cursor-pointer hover:scale-110 transition-all duration-300">Sign in</Button>
                                        </Link>
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
                            <Link href="/register-case" className="cursor-pointer">
                                <Button className="flex items-center gap-2 font-semibold shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg px-4 py-2 h-10 cursor-pointer hover:scale-110 transition-all duration-300">
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden lg:inline">Report Case</span>
                                    <span className="lg:hidden">Report</span>
                                </Button>
                            </Link>
                            {/* Mobile buttons - always visible */}
                            <Link href="/donate" className="cursor-pointer">
                                <Button variant="outline" size="icon" className="h-9 w-9 cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-300 ease-in-out group" aria-label="Buy me a coffee">
                                    <CupSoda className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                                </Button>
                            </Link>

                            {/* Location display */}
                            {savedLocation && savedLocation.city !== 'Unknown' && (
                                <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-300 p-1.5 rounded-lg hover:bg-accent/50 hover:scale-105">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="font-medium">{savedLocation.city}, {savedLocation.state}</span>
                                </div>
                            )}

                            <SignedIn>
                                {/* Notifications */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-9 w-9 cursor-pointer hover:scale-110 transition-all duration-300" aria-label="Notifications">
                                            <Bell className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64">
                                        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-muted-foreground">No new notifications</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Profile */}
                                <AccountMenu />
                            </SignedIn>

                            <SignedOut>
                                <Link href="/sign-in" className="cursor-pointer">
                                    <Button variant="outline" className="h-10 px-4 text-sm cursor-pointer hover:scale-110 transition-all duration-300">Sign in</Button>
                                </Link>
                            </SignedOut>

                            <ThemeToggle />
                        </div>

                    </div>

                    {/* Mobile expandable menu - inside main container */}
                    {menuState && (
                        <div className="lg:hidden animate-in fade-in-0 slide-in-from-top-2 duration-300">
                            <div className="px-4 py-3">
                                <div className="flex items-center justify-center gap-4">
                                    {/* Secondary actions */}
                                    <Link href="/donate" className="cursor-pointer" onClick={() => setMenuState(false)}>
                                        <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-300 ease-in-out group" aria-label="Buy me a coffee">
                                            <CupSoda className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                                        </Button>
                                    </Link>

                                    <SignedIn>
                                        {/* Notifications */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-10 w-10 cursor-pointer hover:scale-110 transition-all duration-300" aria-label="Notifications">
                                                    <Bell className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-64">
                                                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-muted-foreground">No new notifications</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </SignedIn>

                                    <ThemeToggle />
                                </div>

                                {/* Location display for mobile */}
                                {savedLocation && savedLocation.city !== 'Unknown' && (
                                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span className="font-medium">{savedLocation.city}, {savedLocation.state}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </nav>
        </header>
    )
}