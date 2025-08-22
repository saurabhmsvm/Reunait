"use client"

import { Heart, MapPin } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocationData } from "@/lib/location"
import Link from "next/link"

interface HeaderProps {
  location?: LocationData | null
}

export function Header({ location }: HeaderProps) {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Heart className="h-8 w-8 text-red-500" />
          <h1 className="text-2xl font-bold">FindMe</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/cases" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cases
            </Link>
          </nav>
          {location && location.city !== 'Unknown' && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location.city}, {location.state}</span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
} 