import handler from "@/lib/auth"

// Force NextAuth to use NEXTAUTH_URL for the callback origin on Vercel.
// detectOrigin() returns request host when (process.env.VERCEL ?? process.env.AUTH_TRUST_HOST) is truthy,
// which can differ from NEXTAUTH_URL. Set both to '' so the condition is falsy and NEXTAUTH_URL is used.
async function withFixedOrigin(
  req: Request,
  context: { params: Promise<{ nextauth?: string[] }> }
) {
  const env = process.env as Record<string, string | undefined>
  const origVercel = env.VERCEL
  const origTrustHost = env.AUTH_TRUST_HOST
  try {
    env.VERCEL = ""
    env.AUTH_TRUST_HOST = ""
    return await handler(req, context)
  } finally {
    if (origVercel !== undefined) env.VERCEL = origVercel
    if (origTrustHost !== undefined) env.AUTH_TRUST_HOST = origTrustHost
  }
}

export const GET = withFixedOrigin
export const POST = withFixedOrigin