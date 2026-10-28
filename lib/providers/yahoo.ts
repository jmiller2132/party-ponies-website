import type { OAuthUserConfig } from "next-auth/providers"

export interface YahooProfile {
  sub: string
  name: string
  email: string
  picture: string
}

/**
 * Yahoo OAuth provider for Fantasy Sports.
 * Yahoo always returns an ES256-signed id_token, so this uses the OIDC callback
 * path (idToken: true) with wellKnown supplying Yahoo's JWKS.
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
    type: "oauth",
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
    // openid-client defaults to RS256; Yahoo signs id_tokens with ES256.
    client: {
      id_token_signed_response_alg: "ES256",
    },
    checks: ["state", "nonce"],
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
