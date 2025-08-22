"use client"

import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react"
import { Typography } from "@/components/ui/typography"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-muted/30 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Heart className="h-8 w-8 text-destructive hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-sm"></div>
              </div>
              <Typography variant="h4" as="h3" className="font-bold">
                FindMe
              </Typography>
            </div>
            <Typography variant="muted" className="max-w-xs leading-relaxed">
              Helping families reunite through advanced AI technology and community support. Every search brings hope.
            </Typography>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:rotate-12">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:rotate-12">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:rotate-12">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:rotate-12">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-200">
            <Typography variant="h4" as="h3" className="font-semibold">
              Quick Links
            </Typography>
            <div className="space-y-3">
              <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 font-medium hover:scale-105">
                Home
              </Link>
              <Link href="/cases" className="block text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 font-medium hover:scale-105">
                Search Cases
              </Link>
              <Link href="/about" className="block text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 font-medium hover:scale-105">
                About Us
              </Link>
              <Link href="/contact" className="block text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 font-medium hover:scale-105">
                Contact
              </Link>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-300">
            <Typography variant="h4" as="h3" className="font-semibold">
              Services
            </Typography>
            <div className="space-y-3">
              <Link href="/register-case" className="block text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 font-medium hover:scale-105">
                Report Missing Person
              </Link>
              <Link href="/search" className="block text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 font-medium hover:scale-105">
                Advanced Search
              </Link>
              <Link href="/volunteer" className="block text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 font-medium hover:scale-105">
                Become a Volunteer
              </Link>
              <Link href="/donate" className="block text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 font-medium hover:scale-105">
                Support Our Mission
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-400">
            <Typography variant="h4" as="h3" className="font-semibold">
              Contact Us
            </Typography>
            <div className="space-y-4">
              <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors duration-300">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Typography variant="small" className="text-muted-foreground font-medium">
                    support@findme.com
                  </Typography>
                </div>
              </div>
              <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors duration-300">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Typography variant="small" className="text-muted-foreground font-medium">
                    +91 1800-FINDME
                  </Typography>
                </div>
              </div>
              <div className="flex items-center gap-3 hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors duration-300">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Typography variant="small" className="text-muted-foreground font-medium">
                    Mumbai, Maharashtra, India
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border/50 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-500">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <Typography variant="small" className="text-muted-foreground">
              © 2024 FindMe. All rights reserved.
            </Typography>
            <div className="flex space-x-8">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 font-medium">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 font-medium">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 font-medium">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 