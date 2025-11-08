"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CountriesStatesService } from "@/lib/countries-states"
import { useToast } from "@/contexts/toast-context"
import { FlagOff, EyeOff } from "lucide-react"
import Link from "next/link"

type FlaggedItem = {
  caseId: string
  fullName: string
  status: string
  country?: string
  state?: string
  city?: string
}

type FlaggedResponse = {
  items?: FlaggedItem[]
  page?: number
  limit?: number
  total?: number
  hasMore?: boolean
  success?: boolean
  status?: string
  message?: string
}

export function FlaggedClient({ initialCountry = "all" }: { initialCountry?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const { showError, showSuccess } = useToast()

  const [country, setCountry] = React.useState<string>(initialCountry)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [items, setItems] = React.useState<FlaggedItem[]>([])
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
      const url = new URL(`${base}/api/volunteer/flagged`)
      url.searchParams.set("page", String(p))
      url.searchParams.set("limit", String(limit))
      url.searchParams.set("country", c)
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data: FlaggedResponse = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch flagged cases")
      }
      const okItems = data.items || []
      setItems(okItems)
      setPage(data.page || 1)
      setTotal(data.total || 0)
      setHasMore(Boolean(data.hasMore))
    } catch (err: any) {
      showError("Failed to load flagged cases", err?.message || "Please try again.")
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
    router.push(`/volunteer/flagged?${params.toString()}`)
    await fetchData({ page: 1, country })
  }

  const handleUnflag = async (caseId: string) => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) throw new Error("Authentication required")
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const res = await fetch(`${base}/api/volunteer/flagged/${caseId}/unflag`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.status === "error") {
        throw new Error(data?.message || "Failed to unflag case")
      }
      showSuccess("Case unflagged", "The case is visible again.")
      await fetchData()
    } catch (err: any) {
      showError("Unflag failed", err?.message || "Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleHide = async (caseId: string) => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) throw new Error("Authentication required")
      const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
      const res = await fetch(`${base}/api/volunteer/flagged/${caseId}/hide`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.status === "error") {
        throw new Error(data?.message || "Failed to hide case")
      }
      showSuccess("Case hidden", "The case has been removed due to violations.")
      await fetchData()
    } catch (err: any) {
      showError("Hide failed", err?.message || "Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const countries = React.useMemo(() => {
    const list = CountriesStatesService.getCountries()
    return ["all", ...list]
  }, [])

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
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium min-w-[120px]">Case</th>
                <th className="text-left px-3 py-2 font-medium min-w-[100px]">Status</th>
                <th className="text-left px-3 py-2 font-medium min-w-[100px]">Country</th>
                <th className="text-right px-3 py-2 font-medium min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: items.length > 0 ? items.length : 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-t">
                    <td className="px-3 py-3"><Skeleton className="h-4 w-[200px]" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-[120px]" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-[100px]" /></td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div>
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10">
                    <div className="text-center text-sm text-muted-foreground">
                      No flagged cases. Try a different country.
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                const countryStr = c.country || "—"
                return (
                  <tr key={c.caseId} className="border-t">
                    <td className="px-3 py-2 min-w-[120px] max-w-[280px]">
                      <Link href={`/cases/${c.caseId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline cursor-pointer break-words">
                        {c.fullName || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 min-w-[100px]">
                      <span className="capitalize break-words">{c.status || "—"}</span>
                    </td>
                    <td className="px-3 py-2 min-w-[100px]">
                      <span className="break-words">{countryStr}</span>
                    </td>
                    <td className="px-3 py-2 min-w-[100px]">
                      <TooltipProvider>
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="outline" className="cursor-pointer h-8 w-8 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/40" onClick={() => handleUnflag(c.caseId)} disabled={loading} aria-label="Unflag case">
                                <FlagOff className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Unflag case</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="destructive" className="cursor-pointer h-8 w-8" onClick={() => handleHide(c.caseId)} disabled={loading} aria-label="Hide case">
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Hide case</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
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
          router.push(`/volunteer/flagged?${params.toString()}`)
          await fetchData({ page: next })
        }}>Previous</Button>
        <Button className="cursor-pointer" disabled={loading || !hasMore} onClick={async () => {
          const next = page + 1
          const params = new URLSearchParams(searchParams.toString())
          params.set("page", String(next))
          router.push(`/volunteer/flagged?${params.toString()}`)
          await fetchData({ page: next })
        }}>Next</Button>
      </div>
    </div>
  )
}


