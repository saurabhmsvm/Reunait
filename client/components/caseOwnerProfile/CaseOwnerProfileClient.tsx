"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Mail, BadgeCheck, MapPin, Calendar, Phone, ChevronDown, ChevronRight, Network } from "lucide-react"
import { CasesGrid } from "@/components/cases/cases-grid"
import { Pagination } from "@/components/ui/pagination"
import type { Case } from "@/lib/api"

type ProfileData = {
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
  ipAddress?: string
  profileImageUrl?: string
  cases?: Case[]
  casesPagination?: {
    currentPage: number
    totalCases: number
    hasMoreCases: boolean
    casesPerPage: number
  }
}

type Props = {
  caseOwner?: string | null
  initialProfile?: ProfileData | null
  initialError?: string | null
}

export default function CaseOwnerProfileClient({ caseOwner, initialProfile, initialError }: Props) {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [loading, setLoading] = React.useState(!initialProfile && !initialError)
  const [error, setError] = React.useState<string | null>(initialError || null)
  const [profile, setProfile] = React.useState<ProfileData | null>(initialProfile || null)
  const [mobileDetailsOpen, setMobileDetailsOpen] = React.useState(false)
  const [casesLoading, setCasesLoading] = React.useState(false)

  React.useEffect(() => {
    if (initialProfile || initialError) return
    ;(async () => {
      if (!isLoaded || !isSignedIn || !caseOwner) return
      try {
        setLoading(true)
        const token = await getToken()
        if (!token) return
        const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
        const res = await fetch(`${base}/api/caseOwnerProfile?caseOwner=${caseOwner}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) {
          if (res.status === 403) setError("Access denied. Only police users can view case owner profiles.")
          else if (res.status === 404) setError("Case owner profile not found.")
          else setError(data?.message || "Failed to fetch profile")
          return
        }
        setProfile(data.data as ProfileData)
      } catch (_) {
        setError("Unable to load profile. Please try again.")
      } finally {
        setLoading(false)
      }
    })()
  }, [getToken, isLoaded, isSignedIn, caseOwner, initialProfile, initialError])

  const initials = (name?: string, fallback: string = "U") => {
    if (!name) return fallback
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name[0].toUpperCase()
  }

  const ROLE_LABELS: Record<string, string> = {
    general_user: "General User",
    police: "Police",
    NGO: "NGO",
    volunteer: "Volunteer",
    police_denied: "Police (Denied)",
  }

  const RoleBadge = ({ role }: { role?: ProfileData["role"] }) => {
    const label = role ? (ROLE_LABELS[role] || role) : "Unknown"
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs lg:text-sm font-medium max-w-full">
        <BadgeCheck className="h-3.5 w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
        <span className="break-words">{label}</span>
      </span>
    )
  }

  const handleCasesPageChange = async (page: number) => {
    if (!profile || casesLoading || !caseOwner) return
    try {
      setCasesLoading(true)
      const token = await getToken()
      if (!token) return
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const res = await fetch(`${base}/api/caseOwnerProfile?caseOwner=${caseOwner}&page=${page}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setProfile(prev => prev ? { ...prev, ...data.data } : null)
      }
    } finally {
      setCasesLoading(false)
    }
  }

  if (!caseOwner) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-4 lg:px-8 xl:px-10 py-6 lg:py-8 max-w-full">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-destructive">Invalid Request</h2>
          <p className="text-muted-foreground">Missing case owner information.</p>
          <Button onClick={() => router.back()} className="mt-4 cursor-pointer">Go Back</Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-4 lg:px-8 xl:px-10 py-6 lg:py-8 max-w-full">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-destructive">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.back()} className="mt-4 cursor-pointer">Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-4 lg:px-8 xl:px-10 py-6 lg:py-8 max-w-full">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()} className="gap-2 hover:bg-muted/50 transition-colors cursor-pointer">
          ← Back to Case Details
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        <div className="lg:col-span-5 w-full lg:sticky lg:top-6">
          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
            {loading ? (
              <SectionSkeleton />
            ) : profile ? (
              <div className="mb-5 relative">
                <div className="h-24 w-full rounded-2xl bg-gray-100 dark:bg-gray-800 pointer-events-none" />
                <div className="relative z-10 -mt-20 px-2 flex justify-center items-center">
                  {profile.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.profileImageUrl} alt="Avatar" className="h-56 w-56 sm:h-64 sm:w-64 lg:h-72 lg:w-72 rounded-full object-cover ring-4 ring-card" />
                  ) : (
                    <div className="h-56 w-56 sm:h-64 sm:w-64 lg:h-72 lg:w-72 rounded-full bg-primary/15 text-primary grid place-items-center text-2xl font-semibold ring-4 ring-card">
                      {initials(profile.fullName, (profile.role || "U")[0])}
                    </div>
                  )}
                </div>
                <div className="mt-5 text-center">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <h2 className="text-xl lg:text-2xl font-semibold tracking-tight break-words max-w-full">{profile.fullName || "Unknown User"}</h2>
                    <RoleBadge role={profile.role} />
                  </div>
                  <div className="mt-1 text-sm lg:text-base text-muted-foreground">
                    {profile.email && (<span className="inline-flex items-center gap-1.5 max-w-full"><Mail className="h-3.5 w-3.5 lg:h-4 lg:w-4 flex-shrink-0" /><span className="break-words">{profile.email}</span></span>)}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="my-3 h-px bg-border" />
            <div className="lg:hidden flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobileDetailsOpen(v => !v)}
                className="text-sm font-medium text-primary flex items-center gap-1 cursor-pointer"
                aria-expanded={mobileDetailsOpen}
              >
                {mobileDetailsOpen ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                <span className="break-words">Profile details</span>
              </button>
            </div>

            {loading && (
              <div className={`${mobileDetailsOpen ? "mt-3" : ""} ${mobileDetailsOpen ? "" : "hidden lg:block"}`}>
                <SectionSkeleton />
              </div>
            )}

            {!loading && !error && profile && (
              <div className={`${mobileDetailsOpen ? "mt-3" : ""} ${mobileDetailsOpen ? "" : "hidden lg:block"}`}>
                <div className="space-y-4">
                  {profile?.role === "general_user" && (
                    <div className="space-y-4">
                      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Gender" value={profile?.gender} />
                      <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date of birth" value={profile?.dateOfBirth ? format(new Date(profile.dateOfBirth), "PPP") : "—"} />
                      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Government ID" value={(() => {
                        const gov = profile?.governmentIdNumber || ""
                        const hasSep = gov.includes(":")
                        const [, idNum] = hasSep ? gov.split(":").map(s => s.trim()) : ["Government ID", gov]
                        return idNum || "—"
                      })()} />
                      <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile?.phoneNumber} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={profile?.address} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Country" value={profile?.country} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={profile?.state} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={profile?.city} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Postal code" value={profile?.pincode} />
                      <InfoRow icon={<Network className="h-4 w-4" />} label="IP Address" value={profile?.ipAddress} />
                    </div>
                  )}
                  {profile?.role === "police" && (
                    <div className="space-y-4">
                      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Station Code" value={profile?.governmentIdNumber} />
                      <InfoRow icon={<Phone className="h-4 w-4" />} label="Contact number" value={profile?.phoneNumber} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={profile?.address} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Country" value={profile?.country} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={profile?.state} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={profile?.city} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Postal code" value={profile?.pincode} />
                      <InfoRow icon={<Network className="h-4 w-4" />} label="IP Address" value={profile?.ipAddress} />
                    </div>
                  )}
                  {profile?.role === "NGO" && (
                    <div className="space-y-4">
                      <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label="Registration Number" value={profile?.governmentIdNumber} />
                      <InfoRow icon={<Phone className="h-4 w-4" />} label="Contact number" value={profile?.phoneNumber} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={profile?.address} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Country" value={profile?.country} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={profile?.state} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={profile?.city} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="Postal code" value={profile?.pincode} />
                      <InfoRow icon={<Network className="h-4 w-4" />} label="IP Address" value={profile?.ipAddress} />
                    </div>
                  )}
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
                <h2 className="text-base lg:text-lg font-semibold tracking-tight break-words">Cases by this user</h2>
              </div>
            </div>
            <div className="my-3 h-px bg-border" />

            <div className="[&_.grid]:grid-cols-1 [&_.grid]:md:grid-cols-2 [&_.grid]:lg:grid-cols-2 [&_.grid]:xl:grid-cols-2 [&_.grid]:gap-4">
              <CasesGrid
                cases={profile?.cases || []}
                loading={loading || casesLoading}
                emptyMessage="No cases found for this user"
                getMuted={(c) => (c as any).isFlagged === true}
                showMutedHint
              />
            </div>

            {profile?.casesPagination && profile.casesPagination.totalCases > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={profile.casesPagination.currentPage}
                  totalPages={Math.ceil(profile.casesPagination.totalCases / profile.casesPagination.casesPerPage)}
                  onPageChange={handleCasesPageChange}
                  className="flex-wrap gap-1 sm:gap-2"
                />
                <div className="mt-3 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Showing {((profile.casesPagination.currentPage - 1) * profile.casesPagination.casesPerPage) + 1}-
                    {Math.min(profile.casesPagination.currentPage * profile.casesPagination.casesPerPage, profile.casesPagination.totalCases)} of {profile.casesPagination.totalCases} cases
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <Button size="sm" onClick={() => router.push('/cases')} className="cursor-pointer">Browse cases</Button>
            </div>
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
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-24 w-full rounded-2xl bg-muted"></div>
      </div>
      <div className="animate-pulse">
        <div className="h-72 w-72 rounded-full bg-muted mx-auto"></div>
      </div>
      <div className="animate-pulse space-y-2">
        <div className="h-6 bg-muted rounded w-1/2 mx-auto"></div>
        <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
      </div>
      <div className="animate-pulse space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  )
}









