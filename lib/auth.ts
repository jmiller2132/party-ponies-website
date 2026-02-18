import NextAuth, { NextAuthOptions } from "next-auth"
import YahooProvider from "@/lib/providers/yahoo"
import { createServerSupabaseClient } from "@/lib/supabase"

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  debug: process.env.AUTH_DEBUG === "true", // Logs details; set AUTH_DEBUG=true in Vercel to trace callback errors
  providers: [
    YahooProvider({
      clientId: process.env.YAHOO_CLIENT_ID!,
      clientSecret: process.env.YAHOO_CLIENT_SECRET!,
    }) as unknown as NextAuthOptions["providers"][number],
  ],
  // Temporarily disable adapter to test - we'll store tokens manually in JWT callback
  // adapter: SupabaseAdapter({
  //   url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // }),
  callbacks: {
    async jwt({ token, account, user }) {
      // Store Yahoo tokens in the token object and Supabase (never throw — let sign-in succeed even if Supabase write fails)
      if (account?.provider === "yahoo" && user?.id && account.access_token && account.refresh_token) {
        token.access_token = account.access_token
        token.refresh_token = account.refresh_token
        token.expires_at = account.expires_at != null ? account.expires_at * 1000 : Date.now() + 3600000
        token.providerAccountId = account.providerAccountId
        token.userId = user.id

        try {
          const supabase = createServerSupabaseClient()
          await supabase
            .from('yahoo_tokens')
            .upsert({
              user_id: user.id,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: token.expires_at,
              provider_account_id: account.providerAccountId ?? undefined,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
        } catch (error) {
          console.error("Failed to store tokens in Supabase (sign-in still succeeds):", error)
        }
      }
      return token
    },
    async session({ session, token }) {
      // Store tokens in session for client-side access
      if (token.access_token) {
        session.accessToken = token.access_token as string
        session.refreshToken = token.refresh_token as string
        session.expiresAt = token.expires_at as number
        session.userId = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/api/auth/error",
  },
  session: {
    strategy: "jwt",
  },
}

// NextAuth v4 handler
const handler = NextAuth(authOptions)
export default handler

// Helper function to get session (v4)
export async function getSession() {
  const { getServerSession } = await import("next-auth/next")
  return await getServerSession(authOptions)
}

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    userId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string
    refresh_token?: string
    expires_at?: number
    providerAccountId?: string
    userId?: string
  }
}
