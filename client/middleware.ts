import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define route matchers
const isProtectedRoute = createRouteMatcher(['/profile(.*)', '/register-case(.*)', '/caseOwnerProfile(.*)'])
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Check maintenance mode first
  if (process.env.MAINTENANCE_MODE === 'true') {
    // Rewrite all requests to the maintenance page
    return NextResponse.rewrite(new URL('/maintenance.html', req.url), {
      status: 503,
      headers: {
        'Retry-After': '3600', // 1 hour
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }

  const { userId, sessionClaims } = await auth()

  // If not signed in, protect routes that require authentication
  if (!userId && isProtectedRoute(req)) {
    const returnTo = encodeURIComponent(req.nextUrl.pathname)
    return NextResponse.redirect(new URL(`/sign-in?returnTo=${returnTo}`, req.url))
  }

  // If signed in, handle routing based on onboarding status
  if (userId) {
    let onboardingCompleted = false

    // Try to get onboarding status from session claims first
    const sessionMetadata = (sessionClaims?.publicMetadata as any)?.onboardingCompleted
    if (sessionMetadata !== undefined) {
      onboardingCompleted = sessionMetadata === true
    } else {
      // Fallback: fetch user metadata from Clerk API
      try {
        const client = await clerkClient()
        const user = await client.users.getUser(userId)
        onboardingCompleted = user.publicMetadata?.onboardingCompleted === true
      } catch (error) {
        console.error('Failed to fetch user metadata in middleware:', error)
        
        // Final fallback: check MongoDB via existing profile endpoint
        try {
          const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.1.3:3001"
          const response = await fetch(`${base}/users/profile`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${sessionClaims?.__raw || ''}`,
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            onboardingCompleted = data?.data?.onboardingCompleted === true
          } else {
            onboardingCompleted = false
          }
        } catch (mongoError) {
          console.error('Failed to fetch from MongoDB in middleware:', mongoError)
          onboardingCompleted = false
        }
      }
    }

    // If visiting auth routes and signed in, redirect based on onboarding status
    if (isAuthRoute(req)) {
      if (onboardingCompleted) {
        return NextResponse.redirect(new URL('/profile', req.url))
      } else {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
    }

    // If onboarding not completed, redirect to onboarding (except for onboarding page itself)
    if (!onboardingCompleted && !isOnboardingRoute(req) && isProtectedRoute(req)) {
      const returnTo = encodeURIComponent(req.nextUrl.pathname)
      return NextResponse.redirect(new URL(`/onboarding?returnTo=${returnTo}`, req.url))
    }

    // If onboarding completed and on onboarding page, redirect to profile
    if (onboardingCompleted && isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL('/profile', req.url))
    }
  }

  // Allow the request to proceed
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
}


