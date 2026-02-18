import handler from "@/lib/auth"

// Middleware rewrites /api/auth/* to NEXTAUTH_URL so the request host matches.
export const GET = handler
export const POST = handler