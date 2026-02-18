import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * For /api/auth only: set forwarded headers from NEXTAUTH_URL so NextAuth
 * sees the canonical origin. Skip rewrite (caused "something went wrong").
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
