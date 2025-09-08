"use client"

import { useEffect, useState } from "react"
import { useSignIn, useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { CaptchaRegion } from "@/components/auth/CaptchaRegion"
import { getOnboardingStatus } from "@/lib/clerk-metadata"

export default function SignInCatchAllPage() {
  const router = useRouter()
  const search = useSearchParams()
  const rawReturnTo = (search?.get("returnTo")
    || search?.get("returnBackUrl")
    || search?.get("redirect_url")
    || "/profile") as string
  const sanitizeReturnTo = (val: string): string => {
    try {
      const v = (val || "/profile").trim()
      if (!v.startsWith("/")) return "/profile"
      if (v === "/" || v === "/profile" || v.startsWith("/cases")) return v
      return "/profile"
    } catch {
      return "/profile"
    }
  }
  const returnTo = (() => {
    try {
      if (rawReturnTo?.startsWith("http")) {
        const u = new URL(rawReturnTo)
        return sanitizeReturnTo(u.pathname || "/profile")
      }
      return sanitizeReturnTo(rawReturnTo.startsWith("/") ? rawReturnTo : "/profile")
    } catch {
      return "/profile"
    }
  })()
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn() as any
  const { getToken, sessionClaims, isSignedIn, isLoaded: isAuthLoaded } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const routeBasedOnOnboarding = async () => {
    try {
      // Primary: Check Clerk metadata (use top-level sessionClaims to avoid hook misuse)
      const onboardingFromMetadata = getOnboardingStatus(sessionClaims)
      
      if (onboardingFromMetadata !== null) {
        // Metadata exists, use it
        if (onboardingFromMetadata) {
          router.replace(returnTo)
        } else {
          router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
        }
        return
      }
      
      // Fallback: API call if metadata missing
      const token = await getToken()
      if (!token) {
        router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
        return
      }
      const base = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.3:3001"
      const res = await fetch(`${base}/api/users/profile`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => null)
      const completed = res.ok && data?.data?.onboardingCompleted === true
      if (completed) {
        router.replace(returnTo)
      } else {
        router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
      }
    } catch (_) {
      router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
    }
  }

  useEffect(() => {
    if ((isAuthLoaded as any) && (isSignedIn as any)) {
      void routeBasedOnOnboarding()
    }
  }, [isAuthLoaded, isSignedIn, router, returnTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSignInLoaded) return
    setError(null)
    setLoading(true)
    try {
      const res = await signIn.create({ identifier: email, password })
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId })
        await routeBasedOnOnboarding()
      } else {
        setError("Additional steps required. Please use the default sign-in.")
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Sign in failed. Check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!isSignInLoaded) return
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: `/sso-complete?returnTo=${encodeURIComponent(returnTo)}`,
      })
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Google sign-in failed.")
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-center">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6 text-center">Sign in to continue</p>

          {error && (
            <div role="alert" aria-live="polite" className="mb-4 text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground cursor-pointer">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link href={`/reset-password?returnTo=${encodeURIComponent(returnTo)}`} className="text-xs text-primary hover:underline cursor-pointer">
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button type="submit" className="w-full h-10 cursor-pointer" disabled={loading} aria-busy={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <CaptchaRegion className="mt-4 mb-2" />

          <div className="my-4 flex items-center gap-3">
            <div className="h-px w-full bg-border" />
            <span className="text-xs uppercase text-muted-foreground">or</span>
            <div className="h-px w-full bg-border" />
          </div>

          <Button variant="outline" className="w-full h-10 gap-2 cursor-pointer" onClick={handleGoogle}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.64,6.053,29.084,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.64,6.053,29.084,4,24,4C16.318,4,9.656,8.347,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.136,0,9.747-1.971,13.261-5.188l-6.106-5.162C29.066,35.091,26.671,36,24,36 c-5.202,0-9.619-3.317-11.283-7.941l-6.49,5.002C9.627,39.556,16.315,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.236-2.231,4.166-4.106,5.65c0,0,0.001,0,0.001,0 l6.106,5.162C35.91,40.188,44,35,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
            Continue with Google
          </Button>

          <p className="mt-4 text-sm text-muted-foreground">
            Don&apos;t have an account? {" "}
            <Link href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`} className="text-primary hover:underline cursor-pointer">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}


