import handler from "@/lib/auth"

// Force NextAuth to use NEXTAUTH_URL for the callback origin on Vercel.
// NextAuth's detectOrigin() uses request host when process.env.VERCEL is set,
// which can differ from NEXTAUTH_URL and break the OAuth callback. Unsetting
// VERCEL for the duration of the auth request makes detectOrigin use NEXTAUTH_URL.
async function withFixedOrigin(
  req: Request,
  context: { params: Promise<{ nextauth?: string[] }> }
) {
  const orig = process.env.VERCEL
  try {
    delete process.env.VERCEL
    return await handler(req, context)
  } finally {
    if (orig !== undefined) process.env.VERCEL = orig
  }
}

export const GET = withFixedOrigin
export const POST = withFixedOrigin