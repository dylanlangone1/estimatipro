import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedPaths = [
  "/dashboard",
  "/estimate",
  "/estimates",
  "/upload",
  "/pricing-dna",
  "/intelligence",
  "/clients",
  "/settings",
  "/onboarding",
  "/admin",
]

export function middleware(request: NextRequest) {
  // Simple redirect-based protection
  // Full auth check happens in (dashboard)/layout.tsx server component
  // This middleware just handles the initial redirect for unauthenticated users
  // by checking for the session cookie
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !sessionToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/estimate/:path*",
    "/estimates/:path*",
    "/upload/:path*",
    "/pricing-dna/:path*",
    "/intelligence/:path*",
    "/clients/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
}
