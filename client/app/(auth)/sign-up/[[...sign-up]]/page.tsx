"use client"

import { useState, useEffect } from "react"
import { useSignUp, useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { CaptchaRegion } from "@/components/auth/CaptchaRegion"
import { useToast } from "@/contexts/toast-context"

export default function SignUpCatchAllPage() {
  const router = useRouter()
  const search = useSearchParams()
  const rawReturnTo = (search?.get("returnTo")
    || search?.get("returnBackUrl")
    || search?.get("redirect_url")
    || "/profile") as string
  const returnTo = (() => {
    try {
      if (rawReturnTo?.startsWith("http")) {
        const u = new URL(rawReturnTo)
        return u.pathname || "/profile"
      }
      return rawReturnTo.startsWith("/") ? rawReturnTo : "/profile"
    } catch {
      return "/profile"
    }
  })()
  const { isLoaded, signUp, setActive } = useSignUp()
  const { isSignedIn } = useAuth()
  const { showSuccess, showError } = useToast()

  const getFriendlyClerkError = (e: any): string => {
    const raw = e?.errors?.[0]?.message || ""
    const lower = String(raw).toLowerCase()
    if (lower.includes("incorrect") || lower.includes("invalid") || lower.includes("not valid")) {
      return "Invalid verification code. Please try again."
    }
    if (lower.includes("expired")) {
      return "Code expired. Tap Resend code to get a new one."
    }
    if (lower.includes("too many") || lower.includes("rate limit")) {
      return "Too many attempts. Please wait a moment and try again."
    }
    return "Verification failed. Check the code and try again."
  }

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pendingVerification, setPendingVerification] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (!isSignedIn) return
    // If user lands on this page while already signed in (e.g., from OAuth return without OTP flow), send to profile
    if (!pendingVerification) {
      const url = typeof window !== 'undefined' ? new URL(returnTo, window.location.origin).toString() : returnTo
      window.location.assign(url)
    }
    // If pendingVerification, let the OTP verification handler navigate to onboarding
  }, [isSignedIn, pendingVerification, returnTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setError(null)
    setLoading(true)
    try {
      // Create account first
      await signUp.create({ emailAddress: email, password })
      // Transition UI immediately to code step for better perceived performance
      setPendingVerification(true)
      setLoading(false)
      // Trigger Clerk to send the email code in the background
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      showSuccess("We sent a verification code to your email.")
      setResendCooldown(30)
    } catch (err: any) {
      showError(err?.errors?.[0]?.message || "Sign up failed. Please try again.")
      setLoading(false)
    }
    // Ensure loading is reset in all cases
    finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    if (!isLoaded || loading) return
    setError(null)
    const normalized = code.replace(/\D/g, "")
    if (normalized.length !== 6) return
    setLoading(true)
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: normalized })
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId })
        showSuccess("Account created. Let\'s complete your profile.")
        router.push(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`)
      }
    } catch (err: any) {
      showError(getFriendlyClerkError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    await verifyCode()
  }

  useEffect(() => {
    const normalized = code.replace(/\D/g, "")
    if (normalized.length === 6) {
      void verifyCode()
    }
  }, [code])

  const handleGoogle = async () => {
    if (!isLoaded) return
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-up",
        redirectUrlComplete: `/onboarding?returnTo=${encodeURIComponent(returnTo)}`,
      })
    } catch (err: any) {
      showError(err?.errors?.[0]?.message || "Google sign-up failed.")
    }
  }

  const handleResend = async () => {
    if (!isLoaded || resendLoading || resendCooldown > 0) return
    setError(null)
    setResendLoading(true)
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      showSuccess("Verification code resent. Check your inbox.")
      setResendCooldown(30)
    } catch (err: any) {
      showError(err?.errors?.[0]?.message || "Could not resend code. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  const handleChangeEmail = () => {
    setPendingVerification(false)
    setCode("")
    setError(null)
    setLoading(false)
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-7 shadow-sm">
          {!pendingVerification ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-center">Create your free account</h1>
              <p className="text-sm text-muted-foreground mb-6 text-center">Sign up to get started</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-center">Verify your email</h1>
              <p className="text-sm text-muted-foreground mb-6 text-center">Enter the 6‑digit code sent to {email || "your email"}</p>
            </>
          )}

          {/* Using toasts for feedback; inline error removed for consistency */}

          {/* CAPTCHA handled by Clerk (default hide/unhide behavior) */}

          {!pendingVerification ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {/* CAPTCHA will mount in the dedicated region below */}
              <Button type="submit" className="w-full h-10 cursor-pointer" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="block text-center">Verification code</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} pattern="[0-9]*" value={code} onChange={setCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-muted-foreground">Resend code in {String(Math.floor(resendCooldown / 60)).padStart(1,'0')}:{String(resendCooldown % 60).padStart(2,'0')}</span>
                ) : (
                  <Button type="button" variant="ghost" className="h-auto p-0 text-sm text-primary cursor-pointer" onClick={handleResend} disabled={resendLoading}>
                    {resendLoading ? "Resending..." : "Resend code"}
                  </Button>
                )}
              </div>
            </form>
          )}

          {!pendingVerification && <CaptchaRegion className="mt-4 mb-2" />}

          {!pendingVerification && (
            <div className="my-4 flex items-center gap-3">
              <div className="h-px w-full bg-border" />
              <span className="text-xs uppercase text-muted-foreground">or</span>
              <div className="h-px w-full bg-border" />
            </div>
          )}

          {!pendingVerification && (
            <Button variant="outline" className="w-full h-10 gap-2 cursor-pointer" onClick={handleGoogle}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.64,6.053,29.084,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.64,6.053,29.084,4,24,4C16.318,4,9.656,8.347,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.136,0,9.747-1.971,13.261-5.188l-6.106-5.162C29.066,35.091,26.671,36,24,36 c-5.202,0-9.619-3.317-11.283-7.941l-6.49,5.002C9.627,39.556,16.315,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.236-2.231,4.166-4.106,5.65c0,0,0.001,0,0.001,0 l6.106,5.162C35.91,40.188,44,35,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              Continue with Google
            </Button>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account? {" "}
            <Link href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} className="text-primary hover:underline cursor-pointer">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}


