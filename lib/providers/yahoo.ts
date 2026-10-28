import type { OAuthUserConfig } from "next-auth/providers"

export interface YahooProfile {
  sub: string
  name: string
  email: string
  picture: string
}

/**
 * Yahoo OAuth provider for Fantasy Sports.
 * Uses OIDC mode with wellKnown so openid-client auto-fetches Yahoo's JWKS
 * and correctly validates the ES256 id_token Yahoo always returns.
 * checks: ["state"] skips nonce to avoid nonce mismatch errors.
 */
export default function Yahoo<P extends YahooProfile>(
  options: OAuthUserConfig<P>
): any {
  let baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://localhost:3000"
  if (baseUrl.startsWith("http://localhost") || baseUrl.startsWith("http://127.0.0.1")) {
    baseUrl = baseUrl.replace("http://", "https://")
  }
  const redirectUri = `${baseUrl}/api/auth/callback/yahoo`

  return {
    id: "yahoo",
    name: "Yahoo",
    type: "oidc",
    wellKnown: "https://api.login.yahoo.com/.well-known/openid-configuration",
    authorization: {
      url: "https://api.login.yahoo.com/oauth2/request_auth",
      params: {
        scope: "openid",
        response_type: "code",
        redirect_uri: redirectUri,
      },
    },
    token: "https://api.login.yahoo.com/oauth2/get_token",
    userinfo: "https://api.login.yahoo.com/openid/v1/userinfo",
    checks: ["state"],
    idToken: true,
    profile(profile: unknown) {
      const p = profile as Record<string, unknown>
      const sub = (p?.sub ?? p?.id) as string | undefined
      const id = typeof sub === "string" && sub ? sub : `yahoo-${Date.now()}`
      return {
        id,
        name: (p?.name as string) || "Yahoo User",
        email: (p?.email as string) || (sub ? `${sub}@yahoo.com` : ""),
        image: (p?.picture ?? p?.image) as string | undefined,
      }
    },
    ...options,
  }
}
