/**
 * Utility functions for managing league keys
 * - Current year: Auto-detect most recent league for standings
 * - All years: Get all leagues for historical records/rivalry
 */

import { cache } from 'react'
import { getUserLeagues } from "@/app/actions/yahoo-actions"

/**
 * Filter leagues to only include relevant ones:
 * - If NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS is set, only include those exact league keys
 * - Set NEXT_PUBLIC_SHOW_ALL_LEAGUES=true to temporarily bypass filtering
 * - Otherwise, filter by:
 *   - Only NFL leagues (exclude other sports)
 *   - Only private leagues (exclude public leagues)
 *   - Optionally filter by league name pattern
 */
function filterRelevantLeagues(leagues: any[]) {
  // Temporary bypass: if SHOW_ALL_LEAGUES is set, return all leagues
  if (process.env.NEXT_PUBLIC_SHOW_ALL_LEAGUES === 'true') {
    return leagues
  }
  
  // If specific league keys are provided, use those exclusively
  const allowedLeagueKeys = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS
  if (allowedLeagueKeys) {
    const allowedKeys = allowedLeagueKeys.split(',').map(key => key.trim()).filter(Boolean)
    return leagues.filter(league => allowedKeys.includes(league.league_key))
  }
  
  // Otherwise, use filtering logic
  const leagueNameFilter = process.env.NEXT_PUBLIC_LEAGUE_NAME_FILTER // Optional: e.g., "Party Ponies"
  
  return leagues.filter(league => {
    // Only NFL leagues
    if (league.game_code && league.game_code !== 'nfl') {
      return false
    }
    
    // Exclude public leagues
    if (league.is_public === true) {
      return false
    }
    
    // Optional: Filter by league name pattern if specified
    if (leagueNameFilter && league.name) {
      const nameMatch = league.name.toLowerCase().includes(leagueNameFilter.toLowerCase())
      if (!nameMatch) {
        return false
      }
    }
    
    return true
  })
}

/**
 * Get the league key for the current/most recent year
 * Used for standings, live scores, etc.
 * Works without authentication by using allowed league keys from env
 */
export async function getCurrentLeagueKey(): Promise<string | null> {
  // First, try environment variable (explicit override)
  const envLeagueKey = process.env.NEXT_PUBLIC_YAHOO_LEAGUE_KEY
  if (envLeagueKey && envLeagueKey !== "your_league_key_here") {
    return envLeagueKey
  }

  // Second, try to get most recent from allowed league keys (no auth required)
  const allowedLeagueKeys = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS
  if (allowedLeagueKeys) {
    const keys = allowedLeagueKeys.split(',').map(k => k.trim()).filter(Boolean)
    if (keys.length > 0) {
      // Extract year from league key (format: {game_key}.l.{league_id})
      // Game keys roughly correspond to years: 303=2013, 314=2014, etc.
      // Return the last one (should be most recent)
      return keys[keys.length - 1]
    }
  }

  // Third, try to auto-detect from API (requires authentication)
  try {
    const leaguesResult = await getUserLeagues()
    if (leaguesResult.success && leaguesResult.data && leaguesResult.data.length > 0) {
      // Filter to only relevant leagues (NFL, private)
      const filteredLeagues = filterRelevantLeagues(leaguesResult.data)
      
      if (filteredLeagues.length === 0) {
        console.warn("No relevant leagues found after filtering")
        return null
      }
      
      // Sort by season (descending) and return the most recent
      const sortedLeagues = filteredLeagues.sort((a, b) => {
        const seasonA = parseInt(a.season) || 0
        const seasonB = parseInt(b.season) || 0
        return seasonB - seasonA
      })
      return sortedLeagues[0].league_key
    }
  } catch (error) {
    // If auto-detection fails, return null (will show error message)
    console.error("Failed to auto-detect league:", error)
  }

  return null
}

/**
 * Get all league keys across all years
 * Used for historical records, head-to-heads, rivalry tool, etc.
 */
export async function getAllLeagueKeys(): Promise<string[]> {
  try {
    const leaguesResult = await getUserLeagues()
    if (leaguesResult.success && leaguesResult.data && leaguesResult.data.length > 0) {
      // Filter to only relevant leagues (NFL, private)
      const filteredLeagues = filterRelevantLeagues(leaguesResult.data)
      
      // Return all league keys, sorted by season (newest first)
      return filteredLeagues
        .sort((a, b) => {
          const seasonA = parseInt(a.season) || 0
          const seasonB = parseInt(b.season) || 0
          return seasonB - seasonA
        })
        .map(league => league.league_key)
    }
  } catch (error) {
    console.error("Failed to fetch all leagues:", error)
  }

  return []
}

const GAME_KEY_TO_YEAR: Record<string, string> = {
  "314": "2013", "331": "2014", "348": "2015", "359": "2016", "371": "2017",
  "380": "2018", "390": "2019", "399": "2020", "406": "2021", "414": "2022",
  "423": "2023", "449": "2024", "461": "2025",
}

/**
 * Build league list from NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS (no auth required)
 */
function getLeaguesFromEnv(): { league_key: string; season: string; name: string }[] {
  const allowed = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS
  if (!allowed) return []
  const keys = allowed.split(',').map(k => k.trim()).filter(Boolean)
  return keys.map(leagueKey => {
    const gameKey = leagueKey.split('.')[0]
    const season = GAME_KEY_TO_YEAR[gameKey] || new Date().getFullYear().toString()
    return { league_key: leagueKey, season, name: 'Party Ponies' }
  }).sort((a, b) => parseInt(b.season) - parseInt(a.season))
}

/**
 * Get all leagues with metadata (for display purposes)
 * Uses NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS when set (no auth), else Yahoo API (requires sign-in)
 */
export const getAllLeaguesWithMetadata = cache(async () => {
  const fromEnv = getLeaguesFromEnv()
  if (fromEnv.length > 0) return fromEnv

  try {
    const leaguesResult = await getUserLeagues()
    if (leaguesResult.success && leaguesResult.data && leaguesResult.data.length > 0) {
      const filteredLeagues = filterRelevantLeagues(leaguesResult.data)
      return filteredLeagues.sort((a, b) => {
        const seasonA = parseInt(a.season) || 0
        const seasonB = parseInt(b.season) || 0
        return seasonB - seasonA
      })
    }
  } catch (error) {
    console.error("Failed to fetch all leagues:", error)
  }

  return []
})
