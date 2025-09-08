"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"
import { useEffect } from "react"

export default function SsoCallbackPage() {
  useEffect(() => {
    console.log("SSO callback page loaded")
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign-in...</p>
        {/* CAPTCHA Widget - Required for Clerk OAuth flows */}
        <div id="clerk-captcha" data-cl-theme="auto" data-cl-size="normal" data-cl-language="auto" />
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  )
}


