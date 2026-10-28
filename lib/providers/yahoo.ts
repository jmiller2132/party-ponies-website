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
    authorization: {
      url: "https://api.login.yahoo.com/oauth2/request_auth",
      params: {
        scope: "openid fspt-r",
        response_type: "code",
        redirect_uri: redirectUri,
      },
    },
    // Custom token request: manually exchange the code and strip id_token
    // so openid-client never tries to validate Yahoo's ES256 id_token.
    token: {
      url: "https://api.login.yahoo.com/oauth2/get_token",
      async request({ provider, params }: { provider: any; params: any }) {
        const credentials = Buffer.from(
          `${provider.clientId}:${provider.clientSecret}`
        ).toString("base64")
        const response = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: params.code,
            redirect_uri: provider.callbackUrl,
          }),
        })
        const tokens = await response.json()
        delete tokens.id_token // strip ES256 id_token — keeps oauthCallback flow happy
        return { tokens }
      },
    },
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
