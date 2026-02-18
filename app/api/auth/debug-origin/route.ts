import { NextResponse } from "next/server"
import { headers } from "next/headers"

/**
 * Temporary: hit GET /api/auth/debug-origin on production to verify
 * NEXTAUTH_URL and request host match. Remove or guard this in production.
 */
export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "(not set)"
  const h = await headers()
  const requestHost = h.get("x-forwarded-host") ?? h.get("host") ?? "(none)"
  const proto = h.get("x-forwarded-proto") ?? "(none)"
  return NextResponse.json({
    NEXTAUTH_URL: baseUrl,
    "request x-forwarded-host": requestHost,
    "request x-forwarded-proto": proto,
    originWouldBe: baseUrl !== "(not set)" ? baseUrl : `${proto}://${requestHost}`,
  })
}
