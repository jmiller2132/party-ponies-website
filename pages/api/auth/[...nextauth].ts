import NextAuth from "next-auth"
import type { NextApiRequest, NextApiResponse } from "next"
import { authOptions } from "@/lib/auth"

// Set canonical host on req so NextAuth detectOrigin() matches NEXTAUTH_URL (no middleware reliance).
function withCanonicalHost(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse) => void
) {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "")
  if (baseUrl) {
    try {
      const url = new URL(baseUrl)
      const h = req.headers as Record<string, string | string[] | undefined>
      h["x-forwarded-host"] = url.host
      h["host"] = url.host
      h["x-forwarded-proto"] = url.protocol.replace(":", "")
    } catch {
      // ignore
    }
  }
  return handler(req, res)
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withCanonicalHost(req, res, (r, s) => NextAuth(r, s, authOptions))
}
