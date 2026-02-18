declare module "next-auth/providers" {
  export type OAuthUserConfig<P = unknown> = {
    clientId?: string
    clientSecret?: string
    [key: string]: unknown
  }
  export type OAuthConfig<P = unknown> = {
    id: string
    name: string
    type: "oauth"
    profile: (profile: unknown, tokens?: unknown) => P | Promise<P>
    authorization?: { url: string; params?: Record<string, string> }
    token?: string
    userinfo?: string
    checks?: string[]
    client?: Record<string, unknown>
    [key: string]: unknown
  }
}
