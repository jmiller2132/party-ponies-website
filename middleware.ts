import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Rewrite /api/auth/* to NEXTAUTH_URL so the request is handled as if it came
 * from the canonical host. Fixes OAuth callback when Vercel passes a different host.
 */
export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "")
  if (!baseUrl) return NextResponse.next()

  try {
    // Already rewrote (avoid loop); NextResponse.rewrite can run middleware again
    if (request.headers.get("x-nextauth-canonical")) return NextResponse.next()
    const path = request.nextUrl.pathname + request.nextUrl.search
    const rewriteUrl = new URL(path, baseUrl)
    const reqHeaders = new Headers(request.headers)
    reqHeaders.set("x-nextauth-canonical", "1")
    return NextResponse.rewrite(rewriteUrl, { request: { headers: reqHeaders } })
  } catch {
    // ignore
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/auth/:path*"],
}
