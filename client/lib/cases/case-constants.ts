import { AlertCircle, CheckCircle, Clock } from "lucide-react"

export const STATUS_INFO = {
  missing: { 
    icon: AlertCircle, 
    label: "Missing", 
    chip: "bg-red-600 text-white", 
    bg: "bg-red-500/10 dark:bg-red-400/10", 
    color: "text-red-700 dark:text-red-400" 
  },
  found: { 
    icon: CheckCircle, 
    label: "Found", 
    chip: "bg-emerald-600 text-white", 
    bg: "bg-emerald-500/10 dark:bg-emerald-400/10", 
    color: "text-emerald-700 dark:text-emerald-400" 
  },
  closed: { 
    icon: Clock, 
    label: "Closed", 
    chip: "bg-slate-600 text-white", 
    bg: "bg-slate-500/10 dark:bg-slate-400/10", 
    color: "text-slate-700 dark:text-slate-300" 
  },
} as const

export const TIMELINE_DATA = [
  { 
    message: "New lead reported in Bandra West area", 
    time: "2024-01-15T14:30:25.123Z",
    ipAddress: "192.168.1.100"
  },
  { 
    message: "Case status updated to 'Under Investigation'", 
    time: "2024-01-14T10:15:30.456Z",
    ipAddress: "10.0.0.50"
  },
  { 
    message: "Police station contacted for additional details", 
    time: "2024-01-13T16:45:20.789Z",
    ipAddress: null // Simulating missing IP from backend
  },
  { 
    message: "Witness interview scheduled for tomorrow", 
    time: "2024-01-12T09:20:15.321Z",
    ipAddress: "203.0.113.10"
  },
  { 
    message: "Case assigned to Detective Sharma", 
    time: "2024-01-08T11:30:45.654Z",
    ipAddress: "198.51.100.75"
  }
]

export type CaseStatus = keyof typeof STATUS_INFO

