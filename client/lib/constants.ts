import { Search, Users, Shield, Heart } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export const APP_FEATURES: Feature[] = [
  {
    icon: Search,
    title: "AI-Powered Search",
    description: "Find missing persons using advanced facial recognition technology"
  },
  {
    icon: Users,
    title: "Community Support",
    description: "Connect with police, NGOs, and individuals to help find missing persons"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is protected with industry-standard security measures"
  },
  {
    icon: Heart,
    title: "Make a Difference",
    description: "Help reunite families and bring hope to communities"
  }
]

export const APP_STATS = [
  { value: "1,000+", label: "Cases Registered" },
  { value: "500+", label: "Successful Reunions" },
  { value: "50+", label: "Cities Covered" }
]

export const APP_NAME = "FindMe"
export const APP_DESCRIPTION = "Find Missing Persons with AI Technology" 