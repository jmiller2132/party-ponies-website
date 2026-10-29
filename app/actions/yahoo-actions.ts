"use server"

import {
  fetchLeagueStandings,
  fetchCurrentWeekMatchups,
  fetchUserLeagues,
  fetchWeekMatchups,
  fetchAllWeeklyScores,
  fetchLeagueSettings,
  LeagueSettings,
} from "@/lib/yahoo-api"
import { calculatePPSI } from "@/lib/sds-plus"
import { getSession } from "@/lib/auth"
import {
  getCachedStandings,
  cacheStandings,
  getCachedSDSPlus,
  cacheSDSPlus,
  getCachedMatchups,
  cacheMatchups,
  getCachedLeagueSettings,
  cacheLeagueSettings,
} from "@/lib/cache"
import { getAllLeaguesWithMetadata } from "@/lib/league-utils"
import { GAME_KEY_TO_YEAR } from "@/lib/yahoo-game-keys"

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
 * Server Action to fetch league settings (cached).
 * Returns playoff_start_week, num_playoff_teams, num_regular_season_weeks.
 */
export async function getLeagueSettings(leagueKey: string): Promise<{
  success: boolean
  data?: LeagueSettings
  error?: string
}> {
  try {
    // Cache-first
    const cached = await getCachedLeagueSettings(leagueKey)
    if (cached) return { success: true, data: cached }

    // Fetch from Yahoo
    const settings = await fetchLeagueSettings(leagueKey)

    // Determine season for cache key
    const gameKey = leagueKey.split('.')[0]
    const season = GAME_KEY_TO_YEAR[gameKey] || new Date().getFullYear().toString()
    await cacheLeagueSettings(leagueKey, season, settings)

    return { success: true, data: settings }
  } catch (error) {
    console.warn(`[getLeagueSettings] Could not fetch settings for ${leagueKey}:`, error instanceof Error ? error.message : error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch league settings" }
  }
}

/**
 * Server Action to calculate PPSI v2 for a season.
 *
 * Flow:
 *  1. Cache hit → return cached scores (breakdown + total)
 *  2. Cache miss → fetch standings + league settings + weekly scores
 *               → calculatePPSI with correct regularSeasonWeeks + numPlayoffTeams
 *               → cache full v2 result
 *
 * The _skipWeeklyScores param is kept for signature compatibility but is
 * ignored — we always use weekly scores for accurate all-play.
 */
export async function getSDSPlusScores(leagueKey: string, _skipWeeklyScores: boolean = false) {
  try {
    // Resolve season
    let season: string
    try {
      const leagues = await getAllLeaguesWithMetadata()
      const league = leagues.find(l => l.league_key === leagueKey)
      season = league?.season || new Date().getFullYear().toString()
    } catch {
      const gameKey = leagueKey.split('.')[0]
      season = GAME_KEY_TO_YEAR[gameKey] || new Date().getFullYear().toString()
    }

    // ── Cache hit ─────────────────────────────────────────────────────────
    // getCachedSDSPlus returns null for v1 rows, forcing a v2 recompute.
    const cachedScores = await getCachedSDSPlus(leagueKey, season)
    if (cachedScores) {
      // Merge live standings data (W-L-T, PF, PA) so the table always shows current numbers
      const standingsResult = await getLeagueStandings(leagueKey)
      if (standingsResult.success && standingsResult.data) {
        const merged = cachedScores.map(score => {
          const s = standingsResult.data!.find(st => st.team_key === score.team_key)
          if (!s) return score
          return { ...score, wins: s.wins ?? 0, losses: s.losses ?? 0, ties: s.ties ?? 0, points_for: s.points_for ?? 0, points_against: s.points_against ?? 0 }
        })
        return { success: true, data: merged }
      }
      return { success: true, data: cachedScores }
    }

    // ── Cache miss — full recompute ────────────────────────────────────────
    const [standingsResult, weeklyScoresResult, settingsResult] = await Promise.all([
      getLeagueStandings(leagueKey),
      getAllWeeklyScores(leagueKey),
      getLeagueSettings(leagueKey),
    ])

    if (!standingsResult.success || !standingsResult.data) {
      return { success: false, error: standingsResult.error || "Failed to fetch standings" }
    }

    const weeklyScores = (weeklyScoresResult.success ? weeklyScoresResult.data : undefined) ?? []

    // Determine regular-season weeks from league settings (never hardcoded)
    let regularSeasonWeeks: number
    let numPlayoffTeams: number

    if (settingsResult.success && settingsResult.data) {
      regularSeasonWeeks = settingsResult.data.num_regular_season_weeks
      numPlayoffTeams    = settingsResult.data.num_playoff_teams
    } else {
      // Fallback: infer from data (safe default: cap at 14)
      const maxWeek = weeklyScores.length > 0
        ? Math.max(...weeklyScores.map(ws => ws.week))
        : 14
      regularSeasonWeeks = Math.min(maxWeek, 14)
      numPlayoffTeams    = 6
      console.warn(`[getSDSPlusScores] Using fallback regularSeasonWeeks=${regularSeasonWeeks} for ${leagueKey}`)
    }

    const scores = calculatePPSI(
      standingsResult.data,
      weeklyScores,
      regularSeasonWeeks,
      numPlayoffTeams,
      'v2'
    )

    // Merge live standings (W-L-T, PF, PA — Yahoo's totals shown in the table)
    const scoresWithStats = scores.map(score => {
      const s = standingsResult.data!.find(st => st.team_key === score.team_key)
      if (!s) return score
      return {
        ...score,
        wins: s.wins ?? 0,
        losses: s.losses ?? 0,
        ties: s.ties ?? 0,
        points_for: s.points_for ?? 0,
        points_against: s.points_against ?? 0,
      }
    })

    // Persist accurate v2 results (including breakdown columns)
    await cacheSDSPlus(leagueKey, season, scoresWithStats)

    return { success: true, data: scoresWithStats }
  } catch (error) {
    console.error("Error calculating PPSI:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate PPSI"
    }
  }
}
