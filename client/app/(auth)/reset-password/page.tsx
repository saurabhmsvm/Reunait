"use client"

import { useState, useEffect } from "react"
import { useSignIn, useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useToast } from "@/contexts/toast-context"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { createPortal } from "react-dom"
import { SimpleLoader } from "@/components/ui/simple-loader"

export default function ResetPasswordPage() {
  const router = useRouter()
  const search = useSearchParams()
  const pathname = usePathname()
  const returnTo = (search?.get("returnTo")
    || search?.get("returnBackUrl")
    || search?.get("redirect_url")
    || "/profile") as string
  const { isLoaded, signIn, setActive } = useSignIn()
  const { signOut } = useAuth()
  const { showSuccess, showError } = useToast()

  const [step, setStep] = useState<"request" | "verify">("request")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hide loader when route changes
  useEffect(() => {
    if (isProcessing) {
      setIsProcessing(false)
    }
  }, [pathname])

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) {
      showError("Please wait a second and try again.")
      return
    }
    setError(null)
    setLoading(true)
    setIsProcessing(true)
    try {
      const identifier = email.trim()
      await signIn.create({ strategy: "reset_password_email_code", identifier })
      setStep("verify")
      showSuccess("If this email exists, we sent a verification code.")
      setResendCooldown(30)
      setIsProcessing(false) // Clear loader when transitioning to verify step
    } catch (err: any) {
      // Show neutral message; don't reveal if email exists
      setStep("verify")
      showSuccess("If this email exists, we sent a verification code.")
      setResendCooldown(30)
      setIsProcessing(false) // Clear loader when transitioning to verify step
    } finally {
      setLoading(false)
    }
  }

  const verifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) {
      showError("Please wait a second and try again.")
      return
    }
    setError(null)
    setLoading(true)
    setIsProcessing(true)
    try {
      const normalized = code.replace(/\D/g, "")
      if (normalized.length !== 6) {
        showError("Enter the 6-digit code.")
        setLoading(false)
        setIsProcessing(false)
        return
      }
      if (password.length < 7) {
        showError("Password must be at least 7 characters.")
        setLoading(false)
        setIsProcessing(false)
        return
      }
      if (password !== confirmPassword) {
        showError("Passwords do not match.")
        setLoading(false)
        setIsProcessing(false)
        return
      }
      const res = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code: normalized, password })
      if (res.status === "complete") {
        showSuccess("Password updated. Please sign in with your new password.")
        try {
          // Ensure no active session remains to avoid "session already exists"
          await signOut({ redirectUrl: `/sign-in?returnTo=${encodeURIComponent(returnTo)}` })
          return
        } catch (_) {
          // Fallback: manual navigation
          router.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
          return
        }
      }
    } catch (err: any) {
      const raw = err?.errors?.[0]?.message || ""
      const lower = String(raw).toLowerCase()
      const msg = lower.includes("incorrect") || lower.includes("invalid")
        ? "Invalid code. Please try again."
        : lower.includes("expired")
          ? "Code expired. Please request a new code."
          : "Verification failed. Check the code and try again."
      showError(msg)
      setIsProcessing(false)
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    if (!isLoaded || resendLoading || resendCooldown > 0 || !email) return
    setResendLoading(true)
    try {
      const identifier = email.trim()
      await signIn.create({ strategy: "reset_password_email_code", identifier })
      showSuccess("Verification code resent.")
      setResendCooldown(30)
    } catch (err: any) {
      const raw = err?.errors?.[0]?.message || ""
      const lower = String(raw).toLowerCase()
      const msg = lower.includes("rate") || lower.includes("too many")
        ? "Too many requests. Please wait a moment before trying again."
        : "Could not resend code. Please wait a moment and try again."
      showError(msg)
    } finally {
      setResendLoading(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => setResendCooldown(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  return (
    <>
      {/* Full Screen Loader with Background Blur (Portal to body) */}
      {isProcessing && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
          <SimpleLoader />
        </div>,
        document.body
      )}
      
      <div className="container mx-auto px-4 sm:px-6 md:px-4 lg:px-8 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-center">Reset your password</h1>
          <p className="text-sm text-muted-foreground mb-6 text-center">We will send a verification code to your email</p>

          {/* Feedback provided via toasts for consistency */}

          {step === "request" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full h-10 cursor-pointer" disabled={loading || isProcessing || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isLoaded}>
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyAndReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
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
              {code.replace(/\D/g, "").length === 6 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={password.length > 0 && password.length < 7}
                      aria-describedby="password-help"
                      className={(password.length > 0 && password.length < 7) ? "border-destructive focus-visible:ring-destructive/30" : undefined}
                    />
                    {password.length > 0 && password.length < 7 && (
                      <p id="password-help" className="text-xs text-destructive mt-1">Minimum 7 characters.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
                      aria-describedby="confirm-help"
                      className={(confirmPassword.length > 0 && confirmPassword !== password) ? "border-destructive focus-visible:ring-destructive/30" : undefined}
                    />
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p id="confirm-help" className="text-xs text-destructive mt-1">Passwords do not match.</p>
                    )}
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <Link href="/sign-in" className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Back to sign in</Link>
                <Button type="submit" className="h-10 cursor-pointer" disabled={loading || isProcessing || code.replace(/\D/g, "").length !== 6 || password.length < 7 || password !== confirmPassword || !isLoaded}>
                  Reset password
                </Button>
              </div>
              <div className="flex items-center justify-center">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-muted-foreground text-center">Resend code in {String(Math.floor(resendCooldown / 60)).padStart(1, '0')}:{String(resendCooldown % 60).padStart(2, '0')}</span>
                ) : (
                  <Button type="button" variant="ghost" className="h-auto p-0 text-sm text-primary cursor-pointer" onClick={resendCode} disabled={resendLoading || isProcessing}>
                    {resendLoading ? "Resending..." : "Resend code"}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  )
}


