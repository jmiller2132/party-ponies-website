"use server"

import { fetchLeagueStandings, fetchCurrentWeekMatchups, fetchUserLeagues, fetchWeekMatchups, fetchAllWeeklyScores } from "@/lib/yahoo-api"
import { calculateSDSPlus } from "@/lib/sds-plus"
import { getSession } from "@/lib/auth"
import { getCachedStandings, cacheStandings, getCachedSDSPlus, cacheSDSPlus, getCachedMatchups, cacheMatchups } from "@/lib/cache"
import { getAllLeaguesWithMetadata } from "@/lib/league-utils"

/**
 * Server Action to fetch league standings
 * Uses cached data from Supabase when available, otherwise fetches from Yahoo API
 */
const GAME_KEY_TO_YEAR: Record<string, string> = {
  "314": "2013", "331": "2014", "348": "2015", "359": "2016", "371": "2017",
  "380": "2018", "390": "2019", "399": "2020", "406": "2021", "414": "2022",
  "423": "2023", "449": "2024", "461": "2025",
}

export async function getLeagueStandings(leagueKey: string) {
  try {
    // Derive season from league key (no auth required)
    const gameKey = leagueKey.split('.')[0]
    const season = GAME_KEY_TO_YEAR[gameKey] || new Date().getFullYear().toString()

    // Check cache first
    const cachedStandings = await getCachedStandings(leagueKey, season)
    if (cachedStandings) {
      return { success: true, data: cachedStandings }
    }
    
    // Cache miss - fetch from Yahoo API
    const standings = await fetchLeagueStandings(leagueKey)
    
    // Cache the results for future requests
    await cacheStandings(leagueKey, season, standings)
    
    return { success: true, data: standings }
  } catch (error) {
    console.error("Error fetching standings:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch standings"
    }
  }
}

/**
 * Server Action to fetch current week matchups
 * Uses stored commissioner token from Supabase - no login required
 */
export async function getCurrentWeekMatchups(leagueKey: string) {
  try {
    // No authentication required - uses stored token from Supabase
    const matchups = await fetchCurrentWeekMatchups(leagueKey)
    return { success: true, data: matchups }
  } catch (error) {
    console.error("Error fetching matchups:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch matchups"
    }
  }
}

/**
 * Server Action to fetch user's leagues
 */
export async function getUserLeagues(gameKey?: string) {
  try {
    const session = await getSession()
    
    if (!session?.accessToken || !session?.userId) {
      return { success: false, error: "Not authenticated" }
    }

    // Use the userId from session (stored during OAuth callback)
    const leagues = await fetchUserLeagues(session.userId, gameKey)
    return { success: true, data: leagues }
  } catch (error) {
    console.error("Error fetching leagues:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch leagues" 
    }
  }
}

/**
 * Server Action to fetch matchups for a specific week
 */
export async function getWeekMatchups(leagueKey: string, week: number) {
  try {
    const matchups = await fetchWeekMatchups(leagueKey, week)
    return { success: true, data: matchups }
  } catch (error) {
    console.error("Error fetching week matchups:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch week matchups"
    }
  }
}

/**
 * Server Action to fetch all weekly scores for a season
 * Used for SDS+ calculation
 */
export async function getAllWeeklyScores(leagueKey: string) {
  try {
    const weeklyScores = await fetchAllWeeklyScores(leagueKey)
    return { success: true, data: weeklyScores }
  } catch (error) {
    console.error("Error fetching weekly scores:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch weekly scores"
    }
  }
}

/**
 * Server Action to calculate SDS+ for a season
 * Uses cached data from Supabase when available, otherwise calculates and caches
 * For comparison page, can skip weekly scores to improve performance
 */
export async function getSDSPlusScores(leagueKey: string, skipWeeklyScores: boolean = false) {
  try {
    // Get season from league key (try leagues first, fallback to parsing)
    let season: string
    try {
      const leagues = await getAllLeaguesWithMetadata()
      const league = leagues.find(l => l.league_key === leagueKey)
      season = league?.season || new Date().getFullYear().toString()
    } catch {
      // Fallback: parse season from league key
      const gameKeyToYear: Record<string, string> = {
        "314": "2013", "331": "2014", "348": "2015", "359": "2016", "371": "2017",
        "380": "2018", "390": "2019", "399": "2020", "406": "2021", "414": "2022",
        "423": "2023", "449": "2024", "461": "2025",
      }
      const gameKey = leagueKey.split('.')[0]
      season = gameKeyToYear[gameKey] || new Date().getFullYear().toString()
    }
    
    // Check cache first (only if skipping weekly scores - cached scores don't have full breakdown)
    if (skipWeeklyScores) {
      const cachedScores = await getCachedSDSPlus(leagueKey, season)
      if (cachedScores) {
        // Merge standings data (W-L-T, PF, PA) into cached scores
        const standingsResult = await getLeagueStandings(leagueKey)
        if (standingsResult.success && standingsResult.data) {
          const scoresWithStats = cachedScores.map(score => {
            const standing = standingsResult.data.find(s => s.team_key === score.team_key)
            if (!standing) return score
            
            return {
              ...score,
              wins: standing.wins ?? 0,
              losses: standing.losses ?? 0,
              ties: standing.ties ?? 0,
              points_for: standing.points_for ?? 0,
              points_against: standing.points_against ?? 0,
            }
          })
          return { success: true, data: scoresWithStats }
        }
        return { success: true, data: cachedScores }
      }
    }
    
    // Cache miss - fetch standings first (always needed)
    const standingsResult = await getLeagueStandings(leagueKey)
    
    // Only fetch weekly scores if not skipped (for comparison performance)
    const weeklyScoresResult = skipWeeklyScores 
      ? { success: true, data: [] }
      : await getAllWeeklyScores(leagueKey)

    if (!standingsResult.success || !standingsResult.data) {
      return {
        success: false,
        error: standingsResult.error || "Failed to fetch standings"
      }
    }

    const weeklyScores = weeklyScoresResult.success ? weeklyScoresResult.data : []
    
    // Determine regular season weeks
    const maxWeek = weeklyScores.length > 0 
      ? Math.max(...weeklyScores.map(ws => ws.week))
      : 14
    const regularSeasonWeeks = Math.min(maxWeek, 14)

    const scores = calculateSDSPlus(standingsResult.data, weeklyScores, regularSeasonWeeks)
    
    // Merge standings data (W-L-T, PF, PA) into scores
    const scoresWithStats = scores.map(score => {
      const standing = standingsResult.data.find(s => s.team_key === score.team_key)
      if (!standing) return score
      
      return {
        ...score,
        wins: standing.wins ?? 0,
        losses: standing.losses ?? 0,
        ties: standing.ties ?? 0,
        points_for: standing.points_for ?? 0,
        points_against: standing.points_against ?? 0,
      }
    })

    // Cache the results for future requests (only if skipping weekly scores for performance)
    if (skipWeeklyScores) {
      await cacheSDSPlus(leagueKey, season, scoresWithStats)
    }

    return { success: true, data: scoresWithStats }
  } catch (error) {
    console.error("Error calculating SDS+:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate SDS+"
    }
  }
}
