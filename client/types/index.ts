// Re-export location types
export type { LocationData } from "@/lib/location"

export interface User {
  _id: string
  fullName: string
  email: string
  role: "user" | "admin"
  cases: string[]
  createdAt: string
  updatedAt: string
}

export interface Case {
  _id: string
  fullName: string
  age: string
  gender: "male" | "female" | "other"
  status: "missing" | "found" | "closed"
  country: string
  city: string
  state: string
  dateMissingFound: string
  description: string
  contactNumber: string
  reward: number
  reportedBy: "individual" | "police" | "NGO"
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export interface SearchFilters {
  keyword: string
  country: string
  state: string
  status: "all" | "missing" | "found" | "closed" | undefined
  location: string
  reportedBy: "all" | "individual" | "police" | "NGO" | undefined
  ageRange: string | undefined
  gender: string | undefined
  dateRange: string | undefined
} 