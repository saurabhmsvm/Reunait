"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CountriesStatesService } from "@/lib/countries-states"
import { useToast } from "@/contexts/toast-context"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

type VerificationItem = {
  clerkUserId: string
  name: string
  email: string
  joined?: string | number | Date
  country: string
  state?: string
  city?: string
}

type VerificationsResponse = {
  success: boolean
  data?: {
    items: VerificationItem[]
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  message?: string
}

export function VerificationsClient({ initialCountry = "all" }: { initialCountry?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const { showError, showSuccess } = useToast()

  const [country, setCountry] = React.useState<string>(initialCountry)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [items, setItems] = React.useState<VerificationItem[]>([])
  const [page, setPage] = React.useState<number>(Number(searchParams.get("page") || 1))
  const [limit] = React.useState<number>(20)
  const [total, setTotal] = React.useState<number>(0)
  const [hasMore, setHasMore] = React.useState<boolean>(false)

  const fetchData = React.useCallback(async (opts?: { page?: number; country?: string }) => {
    try {
      setLoading(true)
      const p = opts?.page ?? page
      const c = String(opts?.country ?? country ?? "all").trim() || "all"
      const token = await getToken()
      if (!token) throw new Error("Authentication required")
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const url = new URL(`${base}/api/volunteer/verifications`)
      url.searchParams.set("page", String(p))
      url.searchParams.set("limit", String(limit))
      url.searchParams.set("country", c)
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data: VerificationsResponse = await res.json().catch(() => ({ success: false }))
      if (!res.ok || !data?.success || !data.data) {
        throw new Error(data?.message || "Failed to fetch verifications")
      }
      setItems(data.data.items || [])
      setPage(data.data.page || 1)
      setTotal(data.data.total || 0)
      setHasMore(Boolean(data.data.hasMore))
    } catch (err: any) {
      showError("Failed to load verifications", err?.message || "Please try again.")
      setItems([])
      setTotal(0)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [country, page, limit, getToken, showError])

  React.useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFilters = async () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("country", country || "all")
    params.set("page", "1")
    router.push(`/volunteer/verifications?${params.toString()}`)
    await fetchData({ page: 1, country })
  }

  const handleApprove = async (clerkUserId: string) => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) throw new Error("Authentication required")
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const res = await fetch(`${base}/api/volunteer/verifications/${clerkUserId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to approve verification")
      }
      showSuccess("Verification approved", "Role updated to police.")
      await fetchData()
    } catch (err: any) {
      showError("Approve failed", err?.message || "Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeny = async (clerkUserId: string) => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) throw new Error("Authentication required")
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const res = await fetch(`${base}/api/volunteer/verifications/${clerkUserId}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to deny verification")
      }
      showSuccess("Verification denied", "User removed from Clerk and recorded for audit.")
      await fetchData()
    } catch (err: any) {
      showError("Deny failed", err?.message || "Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const countries = React.useMemo(() => {
    const list = CountriesStatesService.getCountries()
    return ["all", ...list]
  }, [])

  const formatJoined = (v: any) => {
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return "—"
      return d.toLocaleDateString()
    } catch { return "—" }
  }

  const pageFrom = total === 0 ? 0 : (page - 1) * limit + 1
  const pageTo = Math.min(page * limit, total)

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Country</span>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {countries.map(c => (
                <SelectItem key={c} value={c}>{c === "all" ? "All" : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="cursor-pointer" onClick={applyFilters} disabled={loading}>
          Apply
        </Button>
        {total > 0 && (
          <div className="ml-auto text-sm text-muted-foreground">
            {pageFrom}–{pageTo} of {total}
          </div>
        )}
      </div>

      <Card className="overflow-hidden relative">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Name</th>
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-left px-3 py-2 font-medium">Joined</th>
                <th className="text-left px-3 py-2 font-medium">Location</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: items.length > 0 ? items.length : 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-t">
                    <td className="px-3 py-3"><Skeleton className="h-4 w-[160px]" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-[200px]" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-[180px]" /></td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end"><Skeleton className="h-8 w-24" /></div>
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10">
                    <div className="text-center text-sm text-muted-foreground">
                      No pending verifications. Try a different country.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((u) => {
                const location = [u.city, u.state, u.country].filter(Boolean).join(", ")
                return (
                  <tr key={u.clerkUserId} className="border-t">
                    <td className="px-3 py-2 max-w-[240px] truncate">
                      <Link href={`/caseOwnerProfile?caseOwner=${u.clerkUserId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline cursor-pointer">
                        {u.name || "Unknown"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 max-w-[280px] truncate">{u.email || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatJoined(u.joined)}</td>
                    <td className="px-3 py-2 max-w-[260px] truncate">{location || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" className="cursor-pointer" onClick={() => handleApprove(u.clerkUserId)} disabled={loading}>Approve</Button>
                        <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => handleDeny(u.clerkUserId)} disabled={loading}>Deny</Button>
                      </div>
                    </td>
                  </tr>
                )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" className="cursor-pointer" disabled={loading || page <= 1} onClick={async () => {
          const next = page - 1
          const params = new URLSearchParams(searchParams.toString())
          params.set("page", String(next))
          router.push(`/volunteer/verifications?${params.toString()}`)
          await fetchData({ page: next })
        }}>Previous</Button>
        <Button className="cursor-pointer" disabled={loading || !hasMore} onClick={async () => {
          const next = page + 1
          const params = new URLSearchParams(searchParams.toString())
          params.set("page", String(next))
          router.push(`/volunteer/verifications?${params.toString()}`)
          await fetchData({ page: next })
        }}>Next</Button>
      </div>
    </div>
  )
}


