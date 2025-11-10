"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePicker } from "@/components/ui/date-picker"
import { PhoneInput } from "@/components/ui/phone-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CountriesStatesService } from "@/lib/countries-states"
import { useToast } from "@/contexts/toast-context"
import { z } from "zod"
import { Mail, BadgeCheck, Pencil, X, Save, MapPin, Calendar, Phone, ChevronDown, ChevronRight } from "lucide-react"
import { CasesGrid } from "@/components/cases/cases-grid"
import { Pagination } from "@/components/ui/pagination"
import type { Case } from "@/lib/api"

type ProfileData = {
  onboardingCompleted: boolean
  email?: string
  fullName?: string
  orgName?: string
  governmentIdNumber?: string
  phoneNumber?: string
  address?: string
  dateOfBirth?: string | Date | null
  gender?: "male" | "female" | "other"
  city?: string
  state?: string
  country?: string
  pincode?: string
  role?: "general_user" | "police" | "NGO" | "volunteer" | "police_denied"
  isVerified?: boolean | null
  cases?: Case[]
  casesPagination?: {
    currentPage: number
    totalCases: number
    hasMoreCases: boolean
    casesPerPage: number
  }
}

const profileEditSchema = z
  .object({
    fullName: z.string().optional(),
    orgName: z.string().optional(),
    governmentIdNumber: z.string().min(1, "Government ID is required"),
    governmentIdType: z.string().optional(),
    phoneNumber: z.string().min(8, "Enter a valid phone number"),
    address: z.string().min(1, "Address is required"),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    pincode: z.string().min(1, "Postal code is required"),
    role: z.enum(["general_user", "police", "NGO"]),
  })
  .superRefine((val, ctx) => {
    const raw = (val.governmentIdNumber || "").trim()
    const idType = (val.governmentIdType || "").trim()
    let govNum = raw
    if (val.role === "general_user" && raw.includes(":")) {
      const parts = raw.split(":")
      govNum = (parts[1] || "").trim()
    }

    const validateGovNum = (num: string) => {
      if (num && (!/^[A-Za-z0-9\- ]+$/.test(num) || num.length < 6 || num.length > 30)) {
        ctx.addIssue({ path: ["governmentIdNumber"], code: z.ZodIssueCode.custom, message: "Only letters, numbers, dashes, spaces (6–30 chars)" })
      }
    }

    if (val.role === "general_user") {
      if (!val.dateOfBirth || !val.dateOfBirth.trim()) {
        ctx.addIssue({ path: ["dateOfBirth"], code: z.ZodIssueCode.custom, message: "Date of birth is required" })
      }
      if (!idType) {
        ctx.addIssue({ path: ["governmentIdType"], code: z.ZodIssueCode.custom, message: "Name of government issued ID is required" })
      }
      if (!govNum) {
        ctx.addIssue({ path: ["governmentIdNumber"], code: z.ZodIssueCode.custom, message: "Government-issued ID number is required" })
      }
      validateGovNum(govNum)
    } else {
      if (!govNum) {
        ctx.addIssue({ path: ["governmentIdNumber"], code: z.ZodIssueCode.custom, message: val.role === "police" ? "Police station code is required" : "Registration number is required" })
      }
      validateGovNum(govNum)
    }
    if (val.role !== "general_user") {
      if (!val.orgName || !val.orgName.trim()) {
        ctx.addIssue({ path: ["orgName"], code: z.ZodIssueCode.custom, message: val.role === "police" ? "Police station name is required" : "Organization name is required" })
      }
    }
    const selectedCountry = (val.country || "").trim()
    if (selectedCountry) {
      const availableStates = CountriesStatesService.getStates(selectedCountry)
      if (availableStates.length > 0) {
        if (!val.state || !val.state.trim()) {
          ctx.addIssue({ path: ["state"], code: z.ZodIssueCode.custom, message: "State is required" })
        }
      }
      const selectedState = (val.state || "").trim()
      if (selectedState) {
        const availableCities = CountriesStatesService.getCities(selectedCountry, selectedState)
        if (availableCities.length > 0) {
          if (!val.city || !val.city.trim()) {
            ctx.addIssue({ path: ["city"], code: z.ZodIssueCode.custom, message: "City is required" })
          }
        }
      }
    }
  })

type ProfileEditValues = z.infer<typeof profileEditSchema>

export default function ProfileClient({ initialProfile }: { initialProfile?: ProfileData | null }) {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { showSuccess, showError, showRateLimit } = useToast()
  
  const [loading, setLoading] = React.useState(!initialProfile)
  const [error, setError] = React.useState<string | null>(null)
  const [profile, setProfile] = React.useState<ProfileData | null>(initialProfile ?? null)
  
  // Get isVerified from profile data (MongoDB is source of truth)
  const isVerified = profile?.isVerified

  const [isEditing, setIsEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [edit, setEdit] = React.useState<ProfileData | null>(initialProfile ?? null)
  const [mobileDetailsOpen, setMobileDetailsOpen] = React.useState(false)
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({})
  const [casesLoading, setCasesLoading] = React.useState(false)

  React.useEffect(() => {
    (async () => {
      if (initialProfile) {
        // SSR provided data; ensure loading is false and state is aligned
        setLoading(false)
        return
      }
      if (!isLoaded || !isSignedIn) return
      try {
        setLoading(true)
        const token = await getToken()
        if (!token) return
        const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
        const res = await fetch(`${base}/api/users/profile`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) {
          setError(data?.message || "Failed to fetch profile")
          return
        }
        const p: ProfileData = data.data
        setProfile(p)
        setEdit(p)
      } catch (_) {
        setError("Unable to load profile. Please try again.")
      } finally {
        setLoading(false)
      }
    })()
  }, [getToken, isLoaded, isSignedIn, initialProfile])

  React.useEffect(() => {
    if (isEditing && edit && profile) {
      validateForm()
    }
  }, [isEditing, edit, profile])

  const initials = (name?: string, fallback: string = "U") => {
    const n = (name || "").trim()
    if (!n) return fallback
    const parts = n.split(/\s+/)
    const first = parts[0]?.[0] || ""
    const last = parts[1]?.[0] || ""
    return (first + last).toUpperCase() || fallback
  }

  const ROLE_LABELS: Record<string, string> = {
    general_user: "General User",
    police: "Police",
    NGO: "NGO",
  }

  const RoleBadge = ({ role, isVerified }: { role?: ProfileData["role"], isVerified?: boolean | null }) => {
    // Show "Police (Pending Verification)" when isVerified is false (MongoDB is source of truth)
    if (isVerified === false) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs lg:text-sm font-medium max-w-full">
          <BadgeCheck className="h-3.5 w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
          <span className="break-words">Police (Pending Verification)</span>
        </span>
      )
    }
    
    const label = role ? (ROLE_LABELS[role] || role) : "Unknown"
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs lg:text-sm font-medium max-w-full">
        <BadgeCheck className="h-3.5 w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
        <span className="break-words">{label}</span>
      </span>
    )
  }

  const validateForm = (): boolean => {
    if (!profile || !edit) return false
    try {
      const formData: ProfileEditValues = {
        fullName: edit.fullName || '',
        orgName: edit.orgName || '',
        governmentIdNumber: edit.governmentIdNumber || '',
        governmentIdType: (() => {
          const gov = edit.governmentIdNumber || ""
          const hasSep = gov.includes(":")
          return hasSep ? gov.split(":")[0]?.trim() || "" : ""
        })(),
        phoneNumber: edit.phoneNumber || '',
        address: edit.address || '',
        dateOfBirth: edit.dateOfBirth ? (edit.dateOfBirth as any).toString() : '',
        gender: edit.gender || 'male',
        city: edit.city || '',
        state: edit.state || '',
        country: edit.country || '',
        pincode: edit.pincode || '',
        role: ((r => (r === 'general_user' || r === 'police' || r === 'NGO') ? r : 'general_user')(profile.role as any)) as 'general_user' | 'police' | 'NGO',
      }
      profileEditSchema.parse(formData)
      setValidationErrors({})
      return true
    } catch (error: any) {
      const issues = error?.issues || error?.errors
      if (Array.isArray(issues)) {
        const errors: Record<string, string> = {}
        issues.forEach((issue: any) => {
          const key = Array.isArray(issue.path) ? issue.path[0] : issue.path
          if (key) errors[key as string] = issue.message
        })
        setValidationErrors(errors)
      }
      return false
    }
  }

  const validateField = (fieldName: string, value: any) => {
    if (!profile || !edit) return
    try {
      const formData: ProfileEditValues = {
        fullName: edit.fullName || '',
        orgName: edit.orgName || '',
        governmentIdNumber: edit.governmentIdNumber || '',
        governmentIdType: (() => {
          const gov = edit.governmentIdNumber || ""
          const hasSep = gov.includes(":")
          return hasSep ? gov.split(":")[0]?.trim() || "" : ""
        })(),
        phoneNumber: edit.phoneNumber || '',
        address: edit.address || '',
        dateOfBirth: edit.dateOfBirth ? (edit.dateOfBirth as any).toString() : '',
        gender: edit.gender || 'male',
        city: edit.city || '',
        state: edit.state || '',
        country: edit.country || '',
        pincode: edit.pincode || '',
        role: ((r => (r === 'general_user' || r === 'police' || r === 'NGO') ? r : 'general_user')(profile.role as any)) as 'general_user' | 'police' | 'NGO',
      }
      ;(formData as any)[fieldName] = value
      profileEditSchema.parse(formData)
      setValidationErrors(prev => { const n = { ...prev }; delete n[fieldName]; return n })
    } catch (error: any) {
      const issues = error?.issues || error?.errors
      if (Array.isArray(issues)) {
        const fieldIssue = issues.find((iss: any) => {
          const key = Array.isArray(iss.path) ? iss.path[0] : iss.path
          return key === fieldName
        })
        if (fieldIssue) {
          setValidationErrors(prev => ({ ...prev, [fieldName]: fieldIssue.message }))
        }
      }
    }
  }

  const isEdited = (original: ProfileData, current: ProfileData): boolean => {
    const normalize = (v?: string | null) => (v ?? "").trim()
    const role = original.role
    const comparableOriginal: Record<string, string> = {
      phoneNumber: normalize(original.phoneNumber),
      address: normalize(original.address),
      country: normalize(original.country),
      state: normalize(original.state),
      city: normalize(original.city),
      pincode: normalize(original.pincode),
      governmentIdNumber: normalize(original.governmentIdNumber),
      orgName: normalize(original.orgName),
      dateOfBirth: original.dateOfBirth ? normalize(typeof original.dateOfBirth === 'string' ? original.dateOfBirth : format(new Date(original.dateOfBirth), 'yyyy-MM-dd')) : "",
    }
    const comparableCurrent: Record<string, string> = {
      phoneNumber: normalize(current.phoneNumber),
      address: normalize(current.address),
      country: normalize(current.country),
      state: normalize(current.state),
      city: normalize(current.city),
      pincode: normalize(current.pincode),
      governmentIdNumber: normalize(current.governmentIdNumber),
      orgName: normalize(current.orgName),
      dateOfBirth: current.dateOfBirth ? normalize(typeof current.dateOfBirth === 'string' ? current.dateOfBirth : format(new Date(current.dateOfBirth as any), 'yyyy-MM-dd')) : "",
    }
    const keys: Array<keyof typeof comparableCurrent> = role === 'general_user'
      ? ["phoneNumber", "address", "country", "state", "city", "pincode", "governmentIdNumber", "dateOfBirth"]
      : ["orgName", "governmentIdNumber", "phoneNumber", "address", "country", "state", "city", "pincode"]
    return keys.some((k) => comparableOriginal[k] !== comparableCurrent[k])
  }

  const handleCasesPageChange = async (page: number) => {
    if (!profile || casesLoading) return
    try {
      setCasesLoading(true)
      const token = await getToken()
      if (!token) return
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const res = await fetch(`${base}/api/users/profile?page=${page}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Failed to load cases")
      const data = await res.json()
      if (data.success && data.data) {
        setProfile(prev => prev ? { ...prev, cases: data.data.cases, casesPagination: data.data.casesPagination } : null)
      }
    } catch (error) {
      console.error("Failed to load cases:", error)
      showError("Failed to load cases. Please try again.")
    } finally {
      setCasesLoading(false)
    }
  }

  const saveEdits = async () => {
    if (!profile || !edit) return
    if (!validateForm()) return
    try {
      setSaving(true)
      const token = await getToken()
      if (!token) return
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const payload: Record<string, any> = {
        role: profile.role,
        fullName: (edit.fullName || '').trim() || undefined,
        orgName: (edit.orgName || '').trim() || undefined,
        governmentIdNumber: (edit.governmentIdNumber || '').trim() || undefined,
        phoneNumber: (edit.phoneNumber || '').trim() || undefined,
        address: (edit.address || '').trim() || undefined,
        country: (edit.country || '').trim() || undefined,
        state: (edit.state || '').trim() || undefined,
        city: (edit.city || '').trim() || undefined,
        pincode: (edit.pincode || '').trim() || undefined,
      }
      if (profile.role === 'general_user') {
        payload.gender = edit.gender
        payload.dateOfBirth = (edit.dateOfBirth as any) ? format(new Date(edit.dateOfBirth as any), 'yyyy-MM-dd') : undefined
      } else if (profile.role === 'police' || profile.role === 'NGO') {
        payload.fullName = (edit.orgName || '').trim() || undefined
      }
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
      const res = await fetch(`${base}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => null)
      if (res.status === 429) {
        const msg = data?.message || 'Too many requests, please try again later.'
        showRateLimit(msg, 'Too many requests')
        setError(msg)
        return
      }
      if (!res.ok || !data?.success) {
        const msg = data?.message || 'Failed to save profile'
        showError(msg)
        setError(msg)
        return
      }
      const updated = data.data as ProfileData
      setProfile(prev => {
        if (!prev) return updated
        const next: ProfileData = { ...prev, ...updated }
        const isArrayOfStrings = Array.isArray(updated.cases) && updated.cases.every((c: any) => typeof c === 'string')
        if (isArrayOfStrings) {
          next.cases = prev.cases
        }
        // Keep previous pagination if server omitted it
        if (updated.casesPagination === undefined) {
          next.casesPagination = prev.casesPagination
        }
        return next
      })
      setEdit(prev => {
        const base = { ...(prev as ProfileData), ...updated }
        const isArrayOfStrings = Array.isArray(updated.cases) && updated.cases.every((c: any) => typeof c === 'string')
        if (isArrayOfStrings) {
          base.cases = (prev as ProfileData)?.cases
        }
        if (updated.casesPagination === undefined) {
          base.casesPagination = (prev as ProfileData)?.casesPagination
        }
        return base
      })
      setIsEditing(false)
      setValidationErrors({})
      showSuccess('Profile updated successfully')
    } catch (_) {
      const msg = 'Unable to save profile. Please try again.'
      showError(msg)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-4 lg:px-8 xl:px-10 py-6 lg:py-8 max-w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        <div className="lg:col-span-5 w-full lg:sticky lg:top-6">
          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
            {loading ? (
              <SectionSkeleton />
            ) : profile ? (
              <div className="mb-5 relative">
                <div className="h-24 w-full rounded-2xl bg-gray-100 dark:bg-gray-800 pointer-events-none" />
                <div className="absolute top-2 right-2 z-30">
                  {!isEditing && isVerified !== false ? (
                    <Button variant="outline" size="icon" className="cursor-pointer" onClick={() => { setIsEditing(true); setEdit(prev => { const p = profile as ProfileData | undefined; if (!p) return prev as any; const effectiveOrg = p.role !== 'general_user' ? ((p.orgName && p.orgName.trim()) || (p.fullName && p.fullName.trim()) || '') : (p.fullName || ''); return { ...(p as any), orgName: effectiveOrg }; }); setMobileDetailsOpen(true); setValidationErrors({}) }} aria-label="Edit profile">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="relative z-10 -mt-20 px-2 flex justify-center items-center">
                  {user?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.imageUrl} alt="Avatar" className="h-56 w-56 sm:h-64 sm:w-64 lg:h-72 lg:w-72 rounded-full object-cover ring-4 ring-card" />
                  ) : (
                    <div className="h-56 w-56 sm:h-64 sm:w-64 lg:h-72 lg:w-72 rounded-full bg-primary/15 text-primary grid place-items-center text-2xl font-semibold ring-4 ring-card">
                      {initials(profile.fullName, (profile.role || "U")[0])}
                    </div>
                  )}
                </div>
                <div className="mt-5 text-center">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <h2 className="text-xl lg:text-2xl font-semibold tracking-tight break-words max-w-full">{profile.fullName || "Your profile"}</h2>
                    <RoleBadge role={profile.role} isVerified={isVerified} />
                  </div>
                  <div className="mt-1 text-sm lg:text-base text-muted-foreground">
                    {profile.email && (<span className="inline-flex items-center gap-1.5 max-w-full"><Mail className="h-3.5 w-3.5 lg:h-4 lg:w-4 flex-shrink-0" /><span className="break-words">{profile.email}</span></span>)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground break-words">No profile found.</div>
            )}

            <div className="my-3 h-px bg-border" />
            <div className="lg:hidden flex items-center justify-between">
              <button type="button" onClick={() => setMobileDetailsOpen(v => !v)} className="text-sm font-medium text-primary flex items-center gap-1 cursor-pointer" aria-expanded={mobileDetailsOpen}>
                {mobileDetailsOpen ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                <span className="break-words">Profile details</span>
              </button>
            </div>

            {loading && (
              <div className={`${mobileDetailsOpen ? "mt-3" : ""} ${mobileDetailsOpen ? "" : "hidden lg:block"}`}>
                <SectionSkeleton />
              </div>
            )}

            {!loading && !error && profile && !isEditing && (
              <div className={`${mobileDetailsOpen ? "mt-3" : ""} ${mobileDetailsOpen ? "" : "hidden lg:block"}`}>
                <div className="space-y-4">
                  {profile.role === "general_user" && renderIndividual(profile)}
                  {profile.role === "police" && renderPolice(profile)}
                  {profile.role === "NGO" && renderNGO(profile)}
                </div>
              </div>
            )}

            {!loading && !error && profile && isEditing && edit && (
              <div className="mt-3">
                <div className="space-y-4">

                  {profile.role !== 'general_user' && (
                    <div className="space-y-2">
                      <Label htmlFor="orgName">{profile.role === 'police' ? 'Police Station Name' : 'Organization Name'}</Label>
                      <Input
                        id="orgName"
                        placeholder={profile.role === 'police' ? 'Enter station name' : 'Enter organization name'}
                        value={edit.orgName || ''}
                        onChange={(e) => { const v = e.target.value; setEdit(prev => ({ ...(prev as ProfileData), orgName: v })); validateField('orgName', v) }}
                        aria-invalid={!!validationErrors.orgName}
                        aria-describedby="orgName-help"
                      />
                      {validationErrors.orgName && (<p id="orgName-help" className="text-xs text-destructive">{validationErrors.orgName}</p>)}
                    </div>
                  )}

                  {profile.role === 'general_user' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <RadioGroup
                          className="grid grid-cols-3 gap-3"
                          value={edit.gender || 'male'}
                          onValueChange={(v) => { setEdit(prev => ({ ...(prev as ProfileData), gender: v as any })); validateField('gender', v) }}
                        >
                          <div className="flex items-center gap-2"><RadioGroupItem id="gender-male" value="male" /><Label htmlFor="gender-male" className="font-normal">Male</Label></div>
                          <div className="flex items-center gap-2"><RadioGroupItem id="gender-female" value="female" /><Label htmlFor="gender-female" className="font-normal">Female</Label></div>
                          <div className="flex items-center gap-2"><RadioGroupItem id="gender-other" value="other" /><Label htmlFor="gender-other" className="font-normal">Other</Label></div>
                        </RadioGroup>
                        {validationErrors.gender && (<p className="text-xs text-destructive">{validationErrors.gender}</p>)}
                      </div>

                      <div className="space-y-2">
                        <Label>Date of birth</Label>
                        <DatePicker
                          date={edit.dateOfBirth ? new Date(edit.dateOfBirth as any) : undefined}
                          onDateChange={(d?: Date) => { const v = d ? d.toISOString().slice(0,10) : ''; setEdit(prev => ({ ...(prev as ProfileData), dateOfBirth: v })); validateField('dateOfBirth', v) }}
                        />
                        {validationErrors.dateOfBirth && (<p className="text-xs text-destructive">{validationErrors.dateOfBirth}</p>)}
                      </div>

                      {(() => {
                        const raw = edit.governmentIdNumber || ''
                        const hasSep = raw.includes(':')
                        const [idType, idNum] = hasSep ? raw.split(':').map(s => s.trim()) : ['', raw]
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1 space-y-2">
                              <Label htmlFor="govIdType">Name of Government ID</Label>
                              <Input id="govIdType" placeholder="Aadhaar, PAN, ..." value={idType} onChange={(e) => {
                                const v = e.target.value
                                const newCombined = v ? `${v}: ${idNum || ''}`.trim() : (idNum || '')
                                setEdit(prev => ({ ...(prev as ProfileData), governmentIdNumber: newCombined }))
                                validateField('governmentIdType', v)
                              }} aria-invalid={!!validationErrors.governmentIdType} aria-describedby="govType-help" />
                              {validationErrors.governmentIdType && (<p id="govType-help" className="text-xs text-destructive">{validationErrors.governmentIdType}</p>)}
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                              <Label htmlFor="govIdNum">Government ID number</Label>
                              <Input id="govIdNum" placeholder="Enter ID number" value={idNum} onChange={(e) => {
                                const v = e.target.value
                                const newCombined = idType ? `${idType}: ${v}` : v
                                setEdit(prev => ({ ...(prev as ProfileData), governmentIdNumber: newCombined }))
                                validateField('governmentIdNumber', newCombined)
                              }} aria-invalid={!!validationErrors.governmentIdNumber} aria-describedby="govNum-help" />
                              {validationErrors.governmentIdNumber && (<p id="govNum-help" className="text-xs text-destructive">{validationErrors.governmentIdNumber}</p>)}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {profile.role !== 'general_user' && (
                    <div className="space-y-2">
                      <Label htmlFor="govId">{profile.role === 'police' ? 'Station Code' : 'Registration Number'}</Label>
                      <Input id="govId" placeholder={profile.role === 'police' ? 'Enter station code' : 'Enter registration number'} value={edit.governmentIdNumber || ''} onChange={(e) => { const v = e.target.value; setEdit(prev => ({ ...(prev as ProfileData), governmentIdNumber: v })); validateField('governmentIdNumber', v) }} aria-invalid={!!validationErrors.governmentIdNumber} aria-describedby="govId-help" />
                      {validationErrors.governmentIdNumber && (<p id="govId-help" className="text-xs text-destructive">{validationErrors.governmentIdNumber}</p>)}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <PhoneInput id="phone" value={edit.phoneNumber || ''} onChange={(v: string) => { setEdit(prev => ({ ...(prev as ProfileData), phoneNumber: v })); validateField('phoneNumber', v) }} aria-invalid={!!validationErrors.phoneNumber} aria-describedby="phone-help" />
                    {validationErrors.phoneNumber && (<p id="phone-help" className="text-xs text-destructive">{validationErrors.phoneNumber}</p>)}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" placeholder="Street, Area" value={edit.address || ''} onChange={(e) => { const v = e.target.value; setEdit(prev => ({ ...(prev as ProfileData), address: v })); validateField('address', v) }} aria-invalid={!!validationErrors.address} aria-describedby="address-help" />
                    {validationErrors.address && (<p id="address-help" className="text-xs text-destructive">{validationErrors.address}</p>)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select value={edit.country || ''} onValueChange={(v) => { setEdit(prev => ({ ...(prev as ProfileData), country: v, state: '', city: '' })); validateField('country', v) }}>
                        <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent>
                          {CountriesStatesService.getCountries().map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      {validationErrors.country && (<p className="text-xs text-destructive">{validationErrors.country}</p>)}
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={edit.state || ''} onValueChange={(v) => { setEdit(prev => ({ ...(prev as ProfileData), state: v, city: '' })); validateField('state', v) }}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {CountriesStatesService.getStates(edit.country || '').map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      {validationErrors.state && (<p className="text-xs text-destructive">{validationErrors.state}</p>)}
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Select value={edit.city || ''} onValueChange={(v) => { setEdit(prev => ({ ...(prev as ProfileData), city: v })); validateField('city', v) }}>
                        <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                        <SelectContent>
                          {CountriesStatesService.getCities(edit.country || '', edit.state || '').map(ci => (<SelectItem key={ci} value={ci}>{ci}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      {validationErrors.city && (<p className="text-xs text-destructive">{validationErrors.city}</p>)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">Postal code</Label>
                    <Input id="pincode" value={edit.pincode || ''} onChange={(e) => { const v = e.target.value; setEdit(prev => ({ ...(prev as ProfileData), pincode: v })); validateField('pincode', v) }} aria-invalid={!!validationErrors.pincode} aria-describedby="pin-help" />
                    {validationErrors.pincode && (<p id="pin-help" className="text-xs text-destructive">{validationErrors.pincode}</p>)}
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <Button variant="outline" onClick={() => { setIsEditing(false); setEdit(profile); setValidationErrors({}); }} disabled={saving} className="flex-1 cursor-pointer">Cancel</Button>
                    <Button onClick={saveEdits} disabled={saving || Object.keys(validationErrors).length > 0 || !edit || !profile || !isEdited(profile, edit)} className="flex-1 cursor-pointer">{saving ? "Saving..." : "Save Changes"}</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 w-full">
          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm min-h-[280px]">
            <div className="space-y-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="inline-block h-5 w-1 rounded bg-primary" aria-hidden="true" />
                <h2 className="text-base lg:text-lg font-semibold tracking-tight break-words">Your cases</h2>
              </div>
              <p className="text-xs lg:text-sm text-muted-foreground break-words">Your submitted or tracked cases appear here.</p>
            </div>
            <div className="my-3 h-px bg-border" />
            <div className="[&_.grid]:grid-cols-1 [&_.grid]:md:grid-cols-2 [&_.grid]:lg:grid-cols-2 [&_.grid]:xl:grid-cols-2 [&_.grid]:gap-4">
              <CasesGrid 
                cases={profile?.cases || []} 
                loading={loading || casesLoading} 
                emptyMessage="You haven't registered any cases yet"
                getMuted={(c) => (c as any).isFlagged === true}
                showMutedHint
              />
            </div>
            {profile?.casesPagination && profile.casesPagination.totalCases > 0 && (
              <div className="mt-6">
                <Pagination currentPage={profile.casesPagination.currentPage} totalPages={Math.ceil(profile.casesPagination.totalCases / profile.casesPagination.casesPerPage)} onPageChange={handleCasesPageChange} className="flex-wrap gap-1 sm:gap-2" />
                <div className="mt-3 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Showing {((profile.casesPagination.currentPage - 1) * profile.casesPagination.casesPerPage) + 1}-{Math.min(profile.casesPagination.currentPage * profile.casesPagination.casesPerPage, profile.casesPagination.totalCases)} of {profile.casesPagination.totalCases} cases
                  </p>
                </div>
              </div>
            )}
            <div className="mt-4"><Button size="sm" onClick={() => router.push('/cases')}>Browse cases</Button></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode, label: string, value?: string | null | undefined }) {
  const display = (value ?? "").toString().trim() || "—"
  return (
    <div className="grid grid-cols-6 gap-2.5 text-sm">
      <div className="col-span-3 flex items-start gap-2 text-muted-foreground/90">
        {icon && <span className="text-muted-foreground/80 flex-shrink-0 mt-0.5">{icon}</span>}
        <span className="break-words leading-relaxed min-w-0">{label}</span>
      </div>
      <div className="col-span-3 break-words">{display}</div>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-3">
          <div className="col-span-3 h-4 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded" />
          <div className="col-span-3 h-4 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer bg-[length:200%_100%] rounded" />
        </div>
      ))}
    </div>
  )
}

function renderIndividual(p: ProfileData) {
  const gov = p.governmentIdNumber || ""
  const hasSep = gov.includes(":")
  const [idType, idNum] = hasSep ? gov.split(":").map(s => s.trim()) : ["Government ID", gov]
  const dobStr = p.dateOfBirth ? format(new Date(p.dateOfBirth), "PPP") : "—"
  return (
    <div className="space-y-4">
      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Gender" value={p.gender} />
      <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date of birth" value={dobStr} />
      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label={idType || "Government ID"} value={idNum || "—"} />
      <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={p.phoneNumber} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={p.address} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Country" value={p.country} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={p.state} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={p.city} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Postal code" value={p.pincode} />
    </div>
  )
}

function renderPolice(p: ProfileData) {
  return (
    <div className="space-y-4">
      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Police Station Name" value={p.orgName} />
      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Station Code" value={p.governmentIdNumber} />
      <InfoRow icon={<Phone className="h-4 w-4" />} label="Contact number" value={p.phoneNumber} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={p.address} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Country" value={p.country} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={p.state} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={p.city} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Postal code" value={p.pincode} />
    </div>
  )
}

function renderNGO(p: ProfileData) {
  return (
    <div className="space-y-4">
      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Organization Name" value={p.orgName} />
      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Registration Number" value={p.governmentIdNumber} />
      <InfoRow icon={<Phone className="h-4 w-4" />} label="Contact number" value={p.phoneNumber} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={p.address} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Country" value={p.country} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={p.state} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={p.city} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Postal code" value={p.pincode} />
    </div>
  )
}


