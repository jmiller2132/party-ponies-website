/**
 * Caching layer for Yahoo Fantasy API data
 * Uses Supabase to cache standings, SDS+ scores, and manager stats
 * 
 * CACHING STRATEGY:
 * - Historical seasons (2013-2024): NEVER expire (data is permanent)
 * - Current season completed weeks: NEVER expire (past weeks don't change)
 * - Current season active data: Refresh weekly (standings, current week matchups)
 * 
 * POTENTIAL ISSUES TO WATCH:
 * 1. Yahoo status values: 'postevent' (completed), 'live' (active), 'upcoming' (future)
 * 2. Season end detection: Once a season ends, ALL weeks should be permanent
 * 3. Edge cases: Null/undefined statuses, API changes, between-seasons periods
 * 4. Future data types: When adding new cached data, apply same logic
 * 
 * NOTE: Historical seasons bypass status check (always permanent) - this is the primary safety mechanism
 * 
 * TESTING: Run `npm run test-cache-logic` to verify status detection
 */

import { createServerSupabaseClient } from './supabase'
import { YahooStanding } from './yahoo-api'
import { SDSPlusScore } from './sds-plus'
import { HeadToHeadRecord } from './manager-utils'

const CURRENT_SEASON_WEEKLY_TTL_HOURS = 168 // Current season: refresh weekly (7 days)
const CURRENT_SEASON_YEAR = new Date().getFullYear()

/**
 * Check if cached data is still fresh
 * 
 * Strategy:
 * - Historical seasons: NEVER expire (data is permanent)
 * - Current season completed weeks: NEVER expire (past weeks don't change)
 * - Current season active data: Refresh weekly (standings, current week matchups)
 */
function isCacheFresh(cachedAt: string, isCurrentSeason: boolean, isCompletedWeek?: boolean): boolean {
  // Historical seasons: never expire - data is permanent
  if (!isCurrentSeason) {
    return true
  }
  
  // Current season completed weeks: never expire (Week 1-13 don't change once they're done)
  if (isCompletedWeek === true) {
    return true
  }
  
  // Current season active data: refresh weekly
  const cacheDate = new Date(cachedAt)
  const now = new Date()
  const hoursSinceCache = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60)
  
  return hoursSinceCache < CURRENT_SEASON_WEEKLY_TTL_HOURS
}

/**
 * Get cached standings for a league
 */
export async function getCachedStandings(leagueKey: string, season: string): Promise<YahooStanding[] | null> {
  const supabase = createServerSupabaseClient()
  const isCurrentSeason = parseInt(season) === CURRENT_SEASON_YEAR
  
  try {
    const { data, error } = await supabase
      .from('league_standings')
      .select('*')
      .eq('league_key', leagueKey)
      .eq('season', season)
      .is('week', null) // Final standings (week = null)
      .order('rank', { ascending: true })
    
    if (error || !data || data.length === 0) {
      return null
    }
    
    // Check if cache is fresh
    const oldestCache = data.reduce((oldest, row) => {
      const rowDate = new Date(row.created_at)
      return !oldest || rowDate < oldest ? rowDate : oldest
    }, null as Date | null)
    
    if (oldestCache && !isCacheFresh(oldestCache.toISOString(), isCurrentSeason)) {
      return null // Cache expired
    }
    
    // Check if owner_name column exists and is populated
    // If owner_name is missing, NULL, or undefined for any row, invalidate cache to force fresh fetch
    const hasMissingOwnerNames = data.some(row => {
      // Check if owner_name column doesn't exist (undefined) or is NULL/empty
      // Note: We don't check if owner_name === team_name because they might legitimately be the same
      return row.owner_name === undefined || row.owner_name === null || row.owner_name === ''
    })
    
    if (hasMissingOwnerNames) {
      // Cache exists but missing owner_name - invalidate to force fresh fetch with owner names
      console.log(`[Cache] Invalidating cache for ${leagueKey} - missing owner_name`)
      return null
    }
    
    // Transform database rows to YahooStanding format
    return data.map(row => ({
      team_key: row.team_key,
      name: row.team_name,
      owner_name: row.owner_name || row.team_name, // Use cached owner_name, fallback to team_name
      rank: row.rank,
      wins: row.wins,
      losses: row.losses,
      ties: row.ties,
      points_for: parseFloat(row.points_for),
      points_against: parseFloat(row.points_against),
    }))
  } catch (error) {
    console.error('Error fetching cached standings:', error)
    return null
  }
}

/**
 * Cache standings for a league
 */
export async function cacheStandings(leagueKey: string, season: string, standings: YahooStanding[]): Promise<void> {
  const supabase = createServerSupabaseClient()
  
  try {
    // Delete old cached standings for this league/season
    await supabase
      .from('league_standings')
      .delete()
      .eq('league_key', leagueKey)
      .eq('season', season)
      .is('week', null)
    
    // Insert new standings
    const rows = standings.map(team => ({
      league_key: leagueKey,
      season: season,
      week: null, // Final standings
      team_key: team.team_key,
      team_name: team.name,
      owner_name: team.owner_name || team.name, // Store owner name
      rank: team.rank,
      wins: team.wins || 0,
      losses: team.losses || 0,
      ties: team.ties || 0,
      points_for: team.points_for,
      points_against: team.points_against,
    }))
    
    await supabase
      .from('league_standings')
      .insert(rows)
  } catch (error) {
    console.error('Error caching standings:', error)
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Get cached SDS+ scores for a league
 */
export async function getCachedSDSPlus(leagueKey: string, season: string): Promise<SDSPlusScore[] | null> {
  const supabase = createServerSupabaseClient()
  const isCurrentSeason = parseInt(season) === CURRENT_SEASON_YEAR
  
  try {
    const { data, error } = await supabase
      .from('sds_plus_cache')
      .select('*')
      .eq('league_key', leagueKey)
      .eq('season', season)
      .order('sds_plus_rank', { ascending: true })
    
    if (error || !data || data.length === 0) {
      return null
    }
    
    // Check if cache is fresh (use oldest cached_at)
    const oldestCache = data.reduce((oldest, row) => {
      const rowDate = new Date(row.cached_at)
      return !oldest || rowDate < oldest ? rowDate : oldest
    }, null as Date | null)
    
    if (oldestCache && !isCacheFresh(oldestCache.toISOString(), isCurrentSeason)) {
      return null // Cache expired
    }
    
    // Transform database rows to SDSPlusScore format
    return data.map(row => ({
      owner: row.owner_name,
      team_key: row.team_key,
      score: parseFloat(row.sds_plus_score),
      rank: row.sds_plus_rank,
      finalRank: row.final_rank,
      breakdown: {
        pfIndexEra: 0,
        allPlayWinPct: 0,
        regularSeasonScore: 0,
        weeklyCeilingRate: 0,
        strengthOfSchedule: 0,
        consistencyIndex: 0,
        postseasonBonus: 0,
        playoffLuckDiff: 0,
      },
      interpretation: '',
      wins: row.wins ?? 0,
      losses: row.losses ?? 0,
      ties: row.ties ?? 0,
      points_for: row.points_for ? parseFloat(row.points_for) : 0,
      points_against: row.points_against ? parseFloat(row.points_against) : 0,
    }))
  } catch (error) {
    console.error('Error fetching cached SDS+ scores:', error)
    return null
  }
}

/**
 * Cache SDS+ scores for a league
 */
export async function cacheSDSPlus(leagueKey: string, season: string, scores: SDSPlusScore[]): Promise<void> {
  const supabase = createServerSupabaseClient()
  
  try {
    // Delete old cached scores for this league/season
    await supabase
      .from('sds_plus_cache')
      .delete()
      .eq('league_key', leagueKey)
      .eq('season', season)
    
    // Insert new scores (callers may pass scores with optional wins/losses/etc. from merged standings)
    const rows = scores.map(score => {
      const s = score as SDSPlusScore & { wins?: number; losses?: number; ties?: number; points_for?: number; points_against?: number }
      return {
        league_key: leagueKey,
        season: season,
        owner_name: score.owner,
        team_key: score.team_key,
        sds_plus_score: score.score,
        sds_plus_rank: score.rank,
        final_rank: score.finalRank,
        wins: s.wins ?? 0,
        losses: s.losses ?? 0,
        ties: s.ties ?? 0,
        points_for: s.points_for ?? 0,
        points_against: s.points_against ?? 0,
      }
    })
    
    await supabase
      .from('sds_plus_cache')
      .insert(rows)
  } catch (error) {
    console.error('Error caching SDS+ scores:', error)
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Get cached manager stats
 */
export async function getCachedManagerStats(): Promise<any[] | null> {
  const supabase = createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('manager_stats_cache')
      .select('*')
      .order('owner_name', { ascending: true })
    
    if (error || !data || data.length === 0) {
      return null
    }
    
    // Check if cache is fresh (use oldest cached_at)
    const oldestCache = data.reduce((oldest, row) => {
      const rowDate = new Date(row.cached_at)
      return !oldest || rowDate < oldest ? rowDate : oldest
    }, null as Date | null)
    
    // Manager stats: refresh weekly (not 24h) to match user's weekly data pull workflow
    // Note: We pass isCurrentSeason=true because manager stats include current season data
    if (oldestCache && !isCacheFresh(oldestCache.toISOString(), true)) {
      return null // Cache expired
    }
    
    return data
  } catch (error) {
    console.error('Error fetching cached manager stats:', error)
    return null
  }
}

/**
 * Cache manager stats
 */
export async function cacheManagerStats(managerStats: any[]): Promise<void> {
  const supabase = createServerSupabaseClient()
  
  try {
    // Delete all cached manager stats
    await supabase
      .from('manager_stats_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    // Insert new stats
    const rows = managerStats.map(stat => ({
      owner_name: stat.owner_name,
      championships: stat.all_time.championships,
      total_wins: stat.all_time.total_wins,
      total_losses: stat.all_time.total_losses,
      total_ties: stat.all_time.total_ties,
      total_points_for: stat.all_time.total_points_for,
      total_points_against: stat.all_time.total_points_against,
      seasons_played: stat.all_time.seasons_played,
      best_finish: stat.all_time.best_finish,
      worst_finish: stat.all_time.worst_finish,
      avg_finish: stat.all_time.avg_finish,
      avg_sds_plus: stat.all_time.avg_sds_plus,
      high_sds_plus: stat.all_time.high_sds_plus,
      low_sds_plus: stat.all_time.low_sds_plus,
      is_active: stat.is_active,
    }))
    
    await supabase
      .from('manager_stats_cache')
      .insert(rows)
  } catch (error) {
    console.error('Error caching manager stats:', error)
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Get cached weekly matchups for a league and week
 */
export async function getCachedMatchups(leagueKey: string, season: string, week: number): Promise<any[] | null> {
  const supabase = createServerSupabaseClient()
  const isCurrentSeason = parseInt(season) === CURRENT_SEASON_YEAR
  
  try {
    const { data, error } = await supabase
      .from('matchups')
      .select('*')
      .eq('league_key', leagueKey)
      .eq('season', season)
      .eq('week', week)
    
    if (error || !data || data.length === 0) {
      return null
    }
    
    // Check if cache is fresh
    const oldestCache = data.reduce((oldest, row) => {
      const rowDate = new Date(row.created_at)
      return !oldest || rowDate < oldest ? rowDate : oldest
    }, null as Date | null)
    
    // For matchups, check if the week is completed
    // Completed weeks never expire, active weeks refresh weekly
    // Yahoo uses: 'postevent' for completed weeks, 'live' for active, 'upcoming' for future
    // Historical seasons are always completed, so check season first
    const isHistoricalSeason = !isCurrentSeason
    const hasCompletedStatus = data.some(row => {
      const status = row.status?.toLowerCase()
      // Yahoo's actual status values: 'postevent' (completed), 'live' (in progress), 'upcoming' (future)
      return status === 'postevent' || status === 'completed' || status === 'finished' || status === 'final'
    })
    // If no explicit completed status but it's a historical season, treat as completed
    const isCompletedWeek = isHistoricalSeason || hasCompletedStatus
    
    if (oldestCache && !isCacheFresh(oldestCache.toISOString(), isCurrentSeason, isCompletedWeek)) {
      return null // Cache expired
    }
    
    // Transform database rows to matchup format
    return data.map(row => ({
      matchup_key: row.matchup_key,
      week: row.week,
      team1: {
        key: row.team1_key,
        name: row.team1_name,
        owner_name: row.team1_owner_name || undefined,
        points: parseFloat(row.team1_points),
      },
      team2: {
        key: row.team2_key,
        name: row.team2_name,
        owner_name: row.team2_owner_name || undefined,
        points: parseFloat(row.team2_points),
      },
      status: row.status,
    }))
  } catch (error) {
    console.error('Error fetching cached matchups:', error)
    return null
  }
}

/**
 * Cache weekly matchups for a league
 */
export async function cacheMatchups(
  leagueKey: string,
  season: string,
  week: number,
  matchups: Array<{
    matchup_key?: string
    week?: number
    team1?: { key: string; name: string; points: number; owner_name?: string }
    team2?: { key: string; name: string; points: number; owner_name?: string }
    status?: string
  }>
): Promise<void> {
  const supabase = createServerSupabaseClient()
  
  try {
    // Delete old cached matchups for this league/season/week
    await supabase
      .from('matchups')
      .delete()
      .eq('league_key', leagueKey)
      .eq('season', season)
      .eq('week', week)
    
    // Insert new matchups
    const rows = matchups
      .filter(m => m.team1 && m.team2)
      .map(matchup => ({
        league_key: leagueKey,
        season: season,
        week: week,
        matchup_key: matchup.matchup_key || `${matchup.team1!.key}-${matchup.team2!.key}`,
        team1_key: matchup.team1!.key,
        team1_name: matchup.team1!.name,
        team1_owner_name: matchup.team1!.owner_name || null,
        team1_points: matchup.team1!.points,
        team2_key: matchup.team2!.key,
        team2_name: matchup.team2!.name,
        team2_owner_name: matchup.team2!.owner_name || null,
        team2_points: matchup.team2!.points,
        status: matchup.status || 'completed',
      }))
    
    if (rows.length > 0) {
      await supabase
        .from('matchups')
        .insert(rows)
    }
  } catch (error) {
    console.error('Error caching matchups:', error)
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Get cached manager list
 */
export async function getCachedManagers(): Promise<string[] | null> {
  const supabase = createServerSupabaseClient()
  
  try {
    // Get unique managers from manager_stats_cache (if it exists and is fresh)
    const { data, error } = await supabase
      .from('manager_stats_cache')
      .select('owner_name, cached_at')
      .order('owner_name', { ascending: true })
    
    if (error || !data || data.length === 0) {
      return null
    }
    
    // Check if cache is fresh (use oldest cached_at)
    const oldestCache = data.reduce((oldest: Date | null, row: { owner_name: string; cached_at?: string | null }) => {
      if (!row.cached_at) return oldest
      const rowDate = new Date(row.cached_at)
      // Check if date is valid
      if (isNaN(rowDate.getTime())) return oldest
      return !oldest || rowDate < oldest ? rowDate : oldest
    }, null as Date | null)
    
    // Manager list: refresh weekly (not 24h) to match user's weekly data pull workflow
    if (oldestCache && !isNaN(oldestCache.getTime()) && !isCacheFresh(oldestCache.toISOString(), true)) {
      return null // Cache expired
    }
    
    return data.map(row => row.owner_name).filter(Boolean)
  } catch (error) {
    console.error('Error fetching cached managers:', error)
    return null
  }
}

/**
 * Get cached head-to-head record
 * Note: manager1 and manager2 order doesn't matter - we normalize to alphabetical order
 */
export async function getCachedHeadToHead(
  manager1: string,
  manager2: string
): Promise<HeadToHeadRecord | null> {
  const supabase = createServerSupabaseClient()
  
  // Normalize order (alphabetically) so we can find records regardless of order
  const [m1, m2] = [manager1, manager2].sort()
  
  try {
    // Try both orderings
    const { data: data1, error: error1 } = await supabase
      .from('head_to_head_cache')
      .select('*')
      .eq('manager1', m1)
      .eq('manager2', m2)
      .single()
    
    if (!error1 && data1) {
      const cacheDate = new Date(data1.cached_at)
      // Validate date
      if (isNaN(cacheDate.getTime())) {
        return null
      }
      const now = new Date()
      const daysSinceCache = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceCache <= 7) {
        return {
          opponent: m2 === manager2 ? m2 : m1,
          wins: data1.wins,
          losses: data1.losses,
          ties: data1.ties,
          total_games: data1.total_games,
          points_for: parseFloat(data1.points_for),
          points_against: parseFloat(data1.points_against),
        }
      }
    }
    
    // Try reverse order
    const { data: data2, error: error2 } = await supabase
      .from('head_to_head_cache')
      .select('*')
      .eq('manager1', m2)
      .eq('manager2', m1)
      .single()
    
    if (error2 || !data2) {
      return null
    }
    
    // Check if cache is fresh
    const cacheDate = new Date(data2.cached_at)
    if (isNaN(cacheDate.getTime())) {
      return null
    }
    const now = new Date()
    const daysSinceCache = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceCache > 7) {
      return null // Cache expired
    }
    
    return {
      opponent: m1 === manager2 ? m1 : m2, // Return in original order
      wins: data2.wins,
      losses: data2.losses,
      ties: data2.ties,
      total_games: data2.total_games,
      points_for: parseFloat(data2.points_for),
      points_against: parseFloat(data2.points_against),
    }
  } catch (error) {
    console.error('Error fetching cached head-to-head record:', error)
    return null
  }
}

/**
 * Batch fetch all cached head-to-head records for multiple manager pairs
 * Much more efficient than individual lookups
 */
export async function getCachedHeadToHeadBatch(
  pairs: Array<[string, string]>
): Promise<Map<string, HeadToHeadRecord>> {
  const supabase = createServerSupabaseClient()
  const resultMap = new Map<string, HeadToHeadRecord>()
  
  if (pairs.length === 0) {
    return resultMap
  }
  
  try {
    // Normalize all pairs to alphabetical order and create lookup keys
    const normalizedPairs = pairs.map(([m1, m2]) => {
      const [n1, n2] = [m1, m2].sort()
      return { original: [m1, m2] as [string, string], normalized: [n1, n2] as [string, string], key: `${n1}|${n2}` }
    })
    
    // Fetch all cached records in one query
    const { data, error } = await supabase
      .from('head_to_head_cache')
      .select('*')
    
    if (error || !data || data.length === 0) {
      return resultMap
    }
    
    // Process cached records
    const now = new Date()
    data.forEach((row) => {
      const cacheDate = new Date(row.cached_at)
      if (isNaN(cacheDate.getTime())) {
        return // Skip invalid dates
      }
      
      const daysSinceCache = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCache > 7) {
        return // Cache expired
      }
      
      // Create key for this cached record (normalized order)
      const key = `${row.manager1}|${row.manager2}`
      
      // Find matching pair
      const pair = normalizedPairs.find(p => p.key === key)
      if (pair) {
        const [originalM1, originalM2] = pair.original
        resultMap.set(key, {
          opponent: originalM2, // Return in original order
          wins: row.wins,
          losses: row.losses,
          ties: row.ties,
          total_games: row.total_games,
          points_for: parseFloat(row.points_for),
          points_against: parseFloat(row.points_against),
        })
      }
    })
    
    return resultMap
  } catch (error) {
    console.error('Error batch fetching cached head-to-head records:', error)
    return resultMap
  }
}

/**
 * Cache head-to-head record
 */
export async function cacheHeadToHead(
  manager1: string,
  manager2: string,
  record: HeadToHeadRecord
): Promise<void> {
  const supabase = createServerSupabaseClient()
  
  // Normalize order (alphabetically)
  const [m1, m2] = [manager1, manager2].sort()
  
  try {
    // Delete old cached record (if exists in either order)
    await supabase
      .from('head_to_head_cache')
      .delete()
      .eq('manager1', m1)
      .eq('manager2', m2)
    
    await supabase
      .from('head_to_head_cache')
      .delete()
      .eq('manager1', m2)
      .eq('manager2', m1)
    
    // Insert new record
    await supabase
      .from('head_to_head_cache')
      .insert({
        manager1: m1,
        manager2: m2,
        wins: record.wins,
        losses: record.losses,
        ties: record.ties,
        total_games: record.total_games,
        points_for: record.points_for,
        points_against: record.points_against,
      })
  } catch (error) {
    console.error('Error caching head-to-head record:', error)
    // Don't throw - caching failures shouldn't break the app
  }
}
