import handler from "@/lib/auth"

// Force NextAuth to use NEXTAUTH_URL for the callback origin on Vercel.
// detectOrigin() returns request host when (process.env.VERCEL ?? process.env.AUTH_TRUST_HOST) is truthy,
// which can differ from NEXTAUTH_URL. Set both to '' so the condition is falsy and NEXTAUTH_URL is used.
async function withFixedOrigin(
  req: Request,
  context: { params: Promise<{ nextauth?: string[] }> }
) {
  const origVercel = process.env.VERCEL
  const origTrustHost = process.env.AUTH_TRUST_HOST
  try {
    process.env.VERCEL = ""
    process.env.AUTH_TRUST_HOST = ""
    return await handler(req, context)
  } finally {
    if (origVercel !== undefined) process.env.VERCEL = origVercel
    if (origTrustHost !== undefined) process.env.AUTH_TRUST_HOST = origTrustHost
  }
}

export const GET = withFixedOrigin
export const POST = withFixedOrigin