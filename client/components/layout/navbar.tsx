"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { Bell, Heart, Menu, Plus, Coffee, MapPin, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Typography } from "@/components/ui/typography"
import { LocationService } from "@/lib/location"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [savedLocation, setSavedLocation] = useState<{ city: string; state: string } | null>(null)

  useEffect(() => {
    const loc = LocationService.getSavedLocation?.()
    if (loc) setSavedLocation(loc)
  }, [])

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b-2 border-border animate-in fade-in-0 slide-in-from-top-2 duration-500">
      <div className="mx-auto w-full md:max-w-none lg:max-w-screen-2xl px-3 sm:px-4 md:px-5 lg:px-8 xl:px-10">
        <div className="flex h-14 items-center justify-between">
          {/* Brand (restored legacy styling) */}
          <Link href="/" className="flex items-center gap-1 lg:gap-2 group animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-100 cursor-pointer">
            <div className="relative">
              <Heart className="h-6 w-6 text-destructive group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-sm group-hover:blur-md transition-all duration-300" />
            </div>
            <Typography variant="h4" as="h1" className="font-bold leading-none group-hover:text-primary transition-colors duration-300 animate-in fade-in-0 scale-in-95 duration-700 delay-300">
              FindMe
            </Typography>
          </Link>

          {/* Desktop actions (restored placement/size) */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2 animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-200">

            {/* Keep legacy primary actions (always visible) */}
            <Link href="/report" className="cursor-pointer">
              <Button className="flex items-center gap-1.5 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg px-4 py-2 h-10 cursor-pointer">
                <Plus className="h-4 w-4" />
                Report Missing Person
              </Button>
            </Link>
            <Link href="/donate" className="cursor-pointer">
              <Button variant="outline" className="flex items-center gap-1.5 hover:scale-105 transition-all duration-300 font-medium border-2 rounded-lg px-3 py-2 h-10 cursor-pointer">
                <Coffee className="h-4 w-4" />
                Donate
              </Button>
            </Link>

            {/* Location display (legacy) */}
            {savedLocation && savedLocation.city !== 'Unknown' && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-300 p-1.5 rounded-lg hover:bg-accent/50 hover:scale-105 animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-500">
                <MapPin className="h-3.5 w-3.5" />
                <span className="font-medium">{savedLocation.city}, {savedLocation.state}</span>
              </div>
            )}

            <SignedIn>
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 cursor-pointer" aria-label="Notifications">
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
              <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
            </SignedIn>

            <SignedOut>
              <Link href="/sign-in" className="cursor-pointer">
                <Button variant="outline" className="h-10 px-4 text-sm cursor-pointer">Sign in</Button>
              </Link>
            </SignedOut>

            <ThemeToggle />
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle menu" className="cursor-pointer">
              {mobileOpen ? (
                <X className="h-5 w-5 transition-transform duration-300 rotate-90" />
              ) : (
                <Menu className="h-5 w-5 transition-transform duration-300" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-3 bg-background/95 backdrop-blur-md border-t-2 border-border animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex flex-col space-y-3">
              <Link href="/report" className="cursor-pointer">
                <Button className="flex items-center gap-2 justify-start font-semibold hover:scale-105 transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg shadow-md h-10 cursor-pointer">
                  <Plus className="h-4 w-4" /> Report Missing Person
                </Button>
              </Link>
              <Link href="/donate" className="cursor-pointer">
                <Button variant="outline" className="flex items-center gap-2 justify-start font-medium shadow-sm hover:scale-105 transition-all duration-300 border-2 rounded-lg h-10 cursor-pointer">
                  <Coffee className="h-4 w-4" /> Donate
                </Button>
              </Link>

              {savedLocation && savedLocation.city !== 'Unknown' && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="font-medium">{savedLocation.city}, {savedLocation.state}</span>
                </div>
              )}

              <SignedOut>
                <Link href="/sign-in" className="cursor-pointer">
                  <Button variant="outline" className="h-10 justify-start px-4 text-sm cursor-pointer">Sign in</Button>
                </Link>
              </SignedOut>

              <SignedIn>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9 cursor-pointer" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
                </div>
              </SignedIn>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}