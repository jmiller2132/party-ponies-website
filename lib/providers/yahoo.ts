import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers"

export interface YahooProfile {
  sub: string
  name: string
  email: string
  picture: string
}

/**
 * Yahoo OAuth provider for Fantasy Sports.
 * In Yahoo Developer app: use Confidential Client, add exact redirect URI
 * (e.g. https://localhost:3000/api/auth/callback/yahoo). No trailing slashes.
 */
export default function Yahoo<P extends YahooProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  // Yahoo requires https redirect_uri; never send http (especially for localhost)
  let baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://localhost:3000"
  if (baseUrl.startsWith("http://localhost") || baseUrl.startsWith("http://127.0.0.1")) {
    baseUrl = baseUrl.replace("http://", "https://")
  }
  const redirectUri = `${baseUrl}/api/auth/callback/yahoo`
  if (process.env.NODE_ENV === "development") {
    console.log("[Yahoo OAuth] redirect_uri sent to Yahoo:", redirectUri)
  }

  return {
    id: "yahoo",
    name: "Yahoo",
    type: "oauth" as const,
    // Plain OAuth 2.0 — no wellKnown/OIDC discovery.
    // wellKnown triggers ID token + nonce verification which Yahoo's flow
    // doesn't satisfy cleanly in NextAuth v4, causing OAuthCallback errors.
    // All endpoints are explicit so we don't need discovery.
    authorization: {
      url: "https://api.login.yahoo.com/oauth2/request_auth",
      params: {
        scope: "openid email",
        response_type: "code",
        redirect_uri: redirectUri,
      },
    },
    token: "https://api.login.yahoo.com/oauth2/get_token",
    userinfo: "https://api.login.yahoo.com/openid/v1/userinfo",
    checks: ["state"],
    profile(profile: unknown) {
      const p = profile as Record<string, unknown>
      const sub = (p?.sub ?? p?.id) as string | undefined
      const id = typeof sub === "string" && sub ? sub : `yahoo-${Date.now()}`
      return {
        id,
        name: (p?.name as string) || "Yahoo User",
        email: (p?.email as string) || (sub ? `${sub}@yahoo.com` : ""),
        image: (p?.picture ?? p?.image) as string | undefined,
      } as unknown as P
    },
    ...options,
  }
}
