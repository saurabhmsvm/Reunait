"use client"

import { Heart, MapPin, Menu, X, Plus, Coffee } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocationData } from "@/lib/location"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Typography } from "@/components/ui/typography"
import { LocationService } from "@/lib/location"

interface NavbarProps {
  location?: LocationData | null
}

export function Navbar({ location }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [savedLocation, setSavedLocation] = useState<LocationData | null>(null)

  useEffect(() => {
    const location = LocationService.getSavedLocation()
    if (location) {
      setSavedLocation(location)
    }
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const displayLocation = location || savedLocation

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b-2 border-border animate-in fade-in-0 slide-in-from-top-2 duration-500">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-100">
            <div className="relative">
              <Heart className="h-6 w-6 text-destructive group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
            </div>
            <Typography variant="h4" as="h1" className="font-bold group-hover:text-primary transition-colors duration-300 animate-in fade-in-0 scale-in-95 duration-700 delay-300">
              FindMe
            </Typography>
          </Link>

          {/* Right Side - Action Buttons, Location, Theme Toggle, Mobile Menu */}
          <div className="flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-200">
            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <Button 
                size="sm" 
                className="flex items-center gap-1.5 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg px-4 py-2 animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Report Missing Person
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                className="flex items-center gap-1.5 hover:scale-105 transition-all duration-300 font-medium border-2 rounded-lg px-3 py-2 hover:bg-accent/50 animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-400"
              >
                <Coffee className="w-3.5 h-3.5" />
                Donate
              </Button>
            </div>

            {/* Action Buttons - Mobile (Icons Only) */}
            <div className="flex lg:hidden items-center gap-1.5">
              <Button 
                size="icon"
                className="hover:scale-105 transition-all duration-300 hover:shadow-md bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                className="hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md border-2 rounded-lg animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-400"
              >
                <Coffee className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Location Display */}
            {displayLocation && displayLocation.city !== 'Unknown' && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-300 p-1.5 rounded-lg hover:bg-accent/50 hover:scale-105 animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-500">
                <MapPin className="h-3.5 w-3.5" />
                <span className="font-medium animate-in fade-in-0 scale-in-95 duration-700 delay-600">{displayLocation.city}, {displayLocation.state}</span>
              </div>
            )}

            {/* Theme Toggle */}
            <div className="relative hover:scale-105 transition-transform duration-300 animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-600">
              <ThemeToggle />
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-accent/50 transition-all duration-300 hover:scale-105 rounded-lg animate-in fade-in-0 slide-in-from-top-4 duration-700 delay-700"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4 transition-transform duration-300 rotate-90" />
              ) : (
                <Menu className="h-4 w-4 transition-transform duration-300" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 bg-background/95 backdrop-blur-md border-t-2 border-border animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex flex-col space-y-3">
              {/* Mobile Action Buttons */}
              <div className="flex flex-col gap-2 animate-in fade-in-0 slide-in-from-top-4 duration-300 delay-100">
                <Button
                  size="sm"
                  className="flex items-center gap-2 justify-start font-semibold hover:scale-105 transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0 rounded-lg shadow-md animate-in fade-in-0 slide-in-from-top-4 duration-300 delay-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Report Missing Person
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 justify-start font-medium shadow-sm hover:scale-105 transition-all duration-300 border-2 rounded-lg animate-in fade-in-0 slide-in-from-top-4 duration-300 delay-300"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  Support Our Mission
                </Button>
              </div>

              {/* Mobile Location Display */}
              {displayLocation && displayLocation.city !== 'Unknown' && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 animate-in fade-in-0 slide-in-from-top-4 duration-300 delay-400">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="font-medium animate-in fade-in-0 scale-in-95 duration-300 delay-500">{displayLocation.city}, {displayLocation.state}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 