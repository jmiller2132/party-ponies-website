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
  return withCanonicalHost(req, res, (r, s) => NextAuth(r, s, authOptions))
}
