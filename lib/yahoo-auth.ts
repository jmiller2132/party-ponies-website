/**
 * Yahoo OAuth 2.0 Configuration
 * Reference: https://developer.yahoo.com/fantasysports/guide/
 */

export const YAHOO_OAUTH_CONFIG = {
  authorizationURL: 'https://api.login.yahoo.com/oauth2/request_auth',
  tokenURL: 'https://api.login.yahoo.com/oauth2/get_token',
  userInfoURL: 'https://api.login.yahoo.com/openid/v1/userinfo',
  fantasyURL: 'https://fantasysports.yahooapis.com/fantasy/v2',
  scope: 'fspt-r',
}

/**
 * Refresh Yahoo access token using refresh token
 */
export async function refreshYahooToken(refreshToken: string) {
  const clientId = process.env.YAHOO_CLIENT_ID!
  const clientSecret = process.env.YAHOO_CLIENT_SECRET!

  try {
    const response = await fetch(YAHOO_OAUTH_CONFIG.tokenURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let parsed: { error?: string } = {}
      try {
        parsed = JSON.parse(errorText)
      } catch {
        // ignore
      }
      if (parsed.error === 'invalid_grant') {
        throw new Error('Yahoo session expired. Please sign in again with Yahoo.')
      }
      throw new Error(`Failed to refresh token: ${errorText}`)
    }

    const data = await response.json()
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Yahoo may or may not return a new refresh token
      expires_at: Date.now() + (data.expires_in * 1000),
    }
  } catch (error) {
    console.error('Error refreshing Yahoo token:', error)
    throw error
  }
}

/**
 * Get valid Yahoo access token (refreshes if needed)
 * If userId is not provided, uses the first available token (commissioner's token)
 */
export async function getValidYahooToken(userId?: string) {
  const { createServerSupabaseClient } = await import('./supabase')
  const supabase = createServerSupabaseClient()

  // Get stored tokens from Supabase
  // If no userId provided, get the first available token (for public access)
  let tokens
  if (userId) {
    const { data, error } = await supabase
      .from('yahoo_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      throw new Error('No tokens found for user. Please re-authenticate.')
    }
    tokens = data
  } else {
    // Get first available token (commissioner's token for public access)
    const { data, error } = await supabase
      .from('yahoo_tokens')
      .select('*')
      .limit(1)
      .single()
    
    if (error || !data) {
      throw new Error('No tokens found in database. Please authenticate once to store tokens.')
    }
    tokens = data
    userId = tokens.user_id // Use the token's user_id for updates
  }

  // Check if token needs refresh (with 5 minute buffer)
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000)
  
  if (tokens.expires_at && tokens.expires_at < fiveMinutesFromNow) {
    // Refresh the token
    const refreshed = await refreshYahooToken(tokens.refresh_token)
    
    // Update tokens in database
    await supabase
      .from('yahoo_tokens')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return refreshed.access_token
  }

  return tokens.access_token
}
