import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * For /api/auth requests, force the host/proto to match NEXTAUTH_URL.
 * NextAuth uses x-forwarded-host and x-forwarded-proto to determine origin on Vercel.
 * If the platform sends a different host (e.g. *.vercel.app), the OAuth callback fails
 * because the redirect_uri we send to Yahoo (from NEXTAUTH_URL) won't match.
 */
export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "")
  if (!baseUrl) return NextResponse.next()

  try {
    const url = new URL(baseUrl)
    const requestHeaders = new Headers(request.headers)
    // NextAuth uses x-forwarded-host ?? host for origin; set both so callback URL matches NEXTAUTH_URL
    requestHeaders.set("x-forwarded-host", url.host)
    requestHeaders.set("x-forwarded-proto", url.protocol.replace(":", ""))
    requestHeaders.set("host", url.host)
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/api/auth/:path*"],
}
