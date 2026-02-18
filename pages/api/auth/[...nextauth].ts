import NextAuth from "next-auth"
import type { NextApiRequest, NextApiResponse } from "next"
import { authOptions } from "@/lib/auth"

// Force NextAuth to see canonical host via Proxy (handles frozen/getter headers on Vercel).
function withCanonicalHost(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse) => void
) {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "")
  const action = (req.query?.nextauth as string[])?.[0]
  const providerId = (req.query?.nextauth as string[])?.[1]
  const isCallback = action === "callback"

  if (isCallback) {
    const raw = req.headers as Record<string, string | string[] | undefined>
    console.log("[NextAuth callback]", {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "(not set)",
      "req.headers[x-forwarded-host]": raw["x-forwarded-host"],
      "req.headers[host]": raw["host"],
      "req.headers[x-forwarded-proto]": raw["x-forwarded-proto"],
      appliedProxy: !!baseUrl,
      providerId,
    })
  }

  if (baseUrl) {
    try {
      const url = new URL(baseUrl)
      const canonicalHost = url.host
      const canonicalProto = url.protocol.replace(":", "")
      const orig = req.headers as Record<string, string | string[] | undefined>
      ;(req as NextApiRequest & { headers: Record<string, string | string[] | undefined> }).headers = new Proxy(orig, {
        get(target, prop: string) {
          if (prop === "x-forwarded-host" || prop === "host") return canonicalHost
          if (prop === "x-forwarded-proto") return canonicalProto
          return target[prop]
        },
      })
    } catch {
      // ignore
    }
  }
  return handler(req, res)
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withCanonicalHost(req, res, (r, s) => {
    const action = (r.query?.nextauth as string[])?.[0]
    const isCallback = action === "callback"
    return NextAuth(r, s, authOptions).catch((err: unknown) => {
      console.error("[NextAuth handler error]", isCallback ? "callback" : action, err)
      s.redirect(302, "/api/auth/error?error=Callback")
    })
  })
}
