import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

export function Footer() {
  const socialLinks = {
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || "#",
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL || "#",
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || "#",
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || "#",
  }

  return (
    <footer
      role="contentinfo"
      className="relative border-t bg-background/50 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
            {/* Brand - Left */}
            <div className="flex items-center gap-2">
              <Logo />
            </div>

            {/* Copyright - Center */}
            <p className="text-xs text-muted-foreground/80 font-medium order-3 sm:order-2">
              © {new Date().getFullYear()} Reunait. All rights reserved.
            </p>

            {/* Social - Right */}
            <nav 
              aria-label="Social media links" 
              className="flex items-center gap-4 order-2 sm:order-3"
            >
              <Link
                href={socialLinks.facebook}
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                aria-label="Visit our Facebook page"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href={socialLinks.twitter}
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                aria-label="Visit our Twitter page"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href={socialLinks.instagram}
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                aria-label="Visit our Instagram page"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href={socialLinks.linkedin}
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                aria-label="Visit our LinkedIn page"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}