"use client"

import { useEffect, useState } from "react"
import { useSignIn, useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { CaptchaRegion } from "@/components/auth/CaptchaRegion"
import { getOnboardingStatus } from "@/lib/clerk-metadata"
import { createPortal } from "react-dom"
import { SimpleLoader } from "@/components/ui/simple-loader"

export default function SignInCatchAllPage() {
  const router = useRouter()
  const search = useSearchParams()
  const pathname = usePathname()
  const rawReturnTo = (search?.get("returnTo")
    || search?.get("returnBackUrl")
    || search?.get("redirect_url")
    || "/profile") as string
  const sanitizeReturnTo = (val: string): string => {
    try {
      const v = (val || "/profile").trim()
      if (!v.startsWith("/")) return "/profile"
      if (v === "/" || v === "/profile" || v.startsWith("/cases") || v === "/register-case") return v
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

  // Check if user was redirected from register-case page
  const origin = search?.get("origin") || ""
  const isFromRegisterCase = returnTo === "/register-case"
  const isFromFlagCase = origin === "flag" && returnTo.startsWith("/cases/")
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn() as any
  const { getToken, sessionClaims, isSignedIn, isLoaded: isAuthLoaded } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isNavigatingToReset, setIsNavigatingToReset] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hide loader when route changes
  useEffect(() => {
    if (isNavigating) {
      setIsNavigating(false)
    }
  }, [pathname])

  // Hide authentication loader when route changes
  useEffect(() => {
    if (isAuthenticating) {
      setIsAuthenticating(false)
    }
  }, [pathname])

  // Hide reset password navigation loader when route changes
  useEffect(() => {
    if (isNavigatingToReset) {
      setIsNavigatingToReset(false)
    }
  }, [pathname])

  const handleSignUpClick = () => {
    setIsNavigating(true)
    router.push(`/sign-up?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const handleForgotPasswordClick = () => {
    setIsNavigatingToReset(true)
    router.push(`/reset-password?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const routeBasedOnOnboarding = async () => {
    try {
      // If user came from register-case, return there directly
      if (isFromRegisterCase) {
        router.replace(returnTo)
        return
      }
      // If user came from flag flow on case detail, return directly to the case
      if (isFromFlagCase) {
        router.replace(returnTo)
        return
      }
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
      
      // Fallback removed to avoid duplicate API calls; assume onboarding needed
      router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
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
    setIsAuthenticating(true)
    try {
      const res = await signIn.create({ identifier: email, password })
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId })
        await routeBasedOnOnboarding()
      } else {
        setError("Additional steps required. Please use the default sign-in.")
        setIsAuthenticating(false)
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Sign in failed. Check your credentials.")
      setIsAuthenticating(false)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!isSignInLoaded) return
    setIsAuthenticating(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: `/sso-complete?returnTo=${encodeURIComponent(returnTo)}`,
      })
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Google sign-in failed.")
      setIsAuthenticating(false)
    }
  }

  return (
    <>
      {/* Full Screen Loader with Background Blur (Portal to body) */}
      {(isNavigating || isAuthenticating || isNavigatingToReset) && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
          <SimpleLoader />
        </div>,
        document.body
      )}
      
      <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-8 sm:py-10 md:py-12 lg:py-14 flex justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-2">Sign in to continue</p>
          </div>
          
          {(isFromRegisterCase || isFromFlagCase) && (
            <div className="mb-8 p-5 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">{isFromRegisterCase ? 'Sign in to report a missing person' : 'Sign in to flag a case'}</h3>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">{isFromRegisterCase ? 'Please sign in to access the missing person reporting form and help reunite families.' : 'Please sign in to report this case. Your report helps keep the platform safe.'}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" aria-live="polite" className="mb-6 text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10 h-11" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button 
                  type="button"
                  onClick={handleForgotPasswordClick}
                  disabled={isNavigatingToReset}
                  className="text-sm text-primary hover:underline cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Forgot password?
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 cursor-pointer text-base font-medium" disabled={loading || isAuthenticating} aria-busy={loading || isAuthenticating}>
              Sign In
            </Button>
          </form>

          <CaptchaRegion className="mt-4 mb-3" />

          <div className="my-4 flex items-center gap-3">
            <div className="h-px w-full bg-border" />
            <span className="text-sm uppercase text-muted-foreground font-medium">or</span>
            <div className="h-px w-full bg-border" />
          </div>

          <Button variant="outline" className="w-full h-12 gap-3 cursor-pointer text-base font-medium" onClick={handleGoogle} disabled={isAuthenticating}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.64,6.053,29.084,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.64,6.053,29.084,4,24,4C16.318,4,9.656,8.347,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.136,0,9.747-1.971,13.261-5.188l-6.106-5.162C29.066,35.091,26.671,36,24,36 c-5.202,0-9.619-3.317-11.283-7.941l-6.49,5.002C9.627,39.556,16.315,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.236-2.231,4.166-4.106,5.65c0,0,0.001,0,0.001,0 l6.106,5.162C35.91,40.188,44,35,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account? {" "}
            <button 
              onClick={handleSignUpClick}
              disabled={isNavigating}
              className="text-primary hover:underline cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
    </>
  )
}


