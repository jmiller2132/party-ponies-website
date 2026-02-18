/**
 * Utility functions for manager/owner data aggregation
 */

import { getAllLeaguesWithMetadata } from "./league-utils"
import { getLeagueKeyForYear } from "./season-utils"
import { fetchLeagueStandings } from "./yahoo-api"
import { getSDSPlusScores } from "@/app/actions/yahoo-actions"
import { getAllStandardizedNames } from "./owner-names"

export interface ManagerSeasonStats {
  year: number
  league_key: string
  rank: number
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  sds_plus?: number
  sds_rank?: number
}

export interface ManagerStats {
  owner_name: string
  seasons: ManagerSeasonStats[]
  all_time: {
    championships: number
    total_wins: number
    total_losses: number
    total_ties: number
    total_points_for: number
    total_points_against: number
    seasons_played: number
    best_finish: number
    worst_finish: number
    avg_finish: number
    avg_sds_plus?: number
    high_sds_plus?: number
    low_sds_plus?: number
  }
  is_active: boolean // Active if played in recent seasons (last 2 years)
}

export interface HeadToHeadRecord {
  opponent: string
  wins: number
  losses: number
  ties: number
  total_games: number
  points_for: number
  points_against: number
}

/**
 * Get all unique managers across all seasons
 * Optimized: Uses cached manager stats when available (much faster!)
 */
export async function getAllManagers(): Promise<string[]> {
  // Check cache first - use manager_stats_cache which is faster
  const { getCachedManagerStats } = await import('@/lib/cache')
  const cachedStats = await getCachedManagerStats()
  
  // If we have cached manager stats, use those names (much faster!)
  if (cachedStats && cachedStats.length > 0) {
    return cachedStats.map(s => s.owner_name).sort()
  }
  
  // Fallback: Check cached managers list
  const { getCachedManagers } = await import('@/lib/cache')
  const cachedManagers = await getCachedManagers()
  if (cachedManagers && cachedManagers.length > 0) {
    return cachedManagers
  }
  
  // Last resort: Fetch from API (slow, but necessary if cache is empty)
  const uniqueNames = new Set<string>()
  
  // Get all leagues
  const leagues = await getAllLeaguesWithMetadata()
  
  if (leagues.length === 0) {
    console.warn('No leagues found - cannot fetch managers')
    return []
  }
  
  // Fetch standings for all leagues in parallel
  const standingsPromises = leagues.map(async (league) => {
    try {
      const standings = await fetchLeagueStandings(league.league_key)
      return standings.map(team => team.owner_name).filter(Boolean) as string[]
    } catch (error) {
      console.error(`Error fetching standings for ${league.league_key}:`, error)
      return []
    }
  })
  
  const allOwnerNames = await Promise.all(standingsPromises)
  
  // Add all unique names
  allOwnerNames.forEach(names => {
    names.forEach(name => uniqueNames.add(name))
  })
  
  const managers = Array.from(uniqueNames).sort()
  
  if (managers.length === 0) {
    console.warn('No managers found in standings - check league configuration')
  }
  
  // Return sorted list
  return managers
}

/**
 * Get all manager stats efficiently - fetches data once and processes all managers
 * Uses cached data from Supabase when available
 */
export async function getAllManagerStatsLightweight(): Promise<ManagerStats[]> {
  // Import cache functions once
  const cacheModule = await import('@/lib/cache')
  const { getCachedManagerStats, cacheManagerStats } = cacheModule
  
  // Check cache first
  const cachedStats = await getCachedManagerStats()
  if (cachedStats) {
    // Transform cached data back to ManagerStats format
    return cachedStats.map((stat: any) => ({
      owner_name: stat.owner_name,
      seasons: [], // Cached stats don't include season breakdown
      all_time: {
        championships: stat.championships,
        total_wins: stat.total_wins,
        total_losses: stat.total_losses,
        total_ties: stat.total_ties,
        total_points_for: parseFloat(stat.total_points_for),
        total_points_against: parseFloat(stat.total_points_against),
        seasons_played: stat.seasons_played,
        best_finish: stat.best_finish,
        worst_finish: stat.worst_finish,
        avg_finish: parseFloat(stat.avg_finish),
        avg_sds_plus: stat.avg_sds_plus ? parseFloat(stat.avg_sds_plus) : undefined,
        high_sds_plus: stat.high_sds_plus ? parseFloat(stat.high_sds_plus) : undefined,
        low_sds_plus: stat.low_sds_plus ? parseFloat(stat.low_sds_plus) : undefined,
      },
      is_active: stat.is_active,
    }))
  }
  
  const leagues = await getAllLeaguesWithMetadata()
  
  // Get the most recent season year
  const availableYears = leagues
    .map(l => parseInt(l.season) || 0)
    .filter(year => year > 0)
  const mostRecentSeasonYear = availableYears.length > 0 ? Math.max(...availableYears) : new Date().getFullYear()
  
  // Fetch ALL standings once (in parallel)
  const standingsPromises = leagues.map(async (league) => {
    const year = parseInt(league.season) || 0
    if (year === 0) return { league, year, standings: null }
    
    try {
      const standings = await fetchLeagueStandings(league.league_key)
      return { league, year, standings }
    } catch (error) {
      return { league, year, standings: null }
    }
  })
  
  const standingsResults = await Promise.all(standingsPromises)
  
  // Skip SDS+ calculation entirely for list view - it's too expensive
  // SDS+ will be calculated on-demand for individual manager pages only
  // Create a map of league_key -> { standings }
  const leagueDataMap = new Map<string, { year: number; standings: any[] }>()
  standingsResults.forEach(({ league, year, standings }) => {
    if (standings) {
      leagueDataMap.set(league.league_key, {
        year,
        standings,
      })
    }
  })
  
  // Collect all unique manager names
  const managerNames = new Set<string>()
  leagueDataMap.forEach(({ standings }) => {
    standings.forEach(team => {
      if (team.owner_name) {
        managerNames.add(team.owner_name)
      }
    })
  })
  
  // Process all managers in a single pass
  const managerStatsMap = new Map<string, ManagerSeasonStats[]>()
  
  leagueDataMap.forEach(({ year, standings, sdsScores }, leagueKey) => {
    standings.forEach(team => {
      const ownerName = team.owner_name
      if (!ownerName) return
      
      if (!managerStatsMap.has(ownerName)) {
        managerStatsMap.set(ownerName, [])
      }
      
      // Find SDS+ score for this manager in this season
      let sdsPlus: number | undefined
      let sdsRank: number | undefined
      if (sdsScores) {
        const managerSDS = sdsScores.find((s: any) => s.owner === ownerName)
        if (managerSDS) {
          sdsPlus = managerSDS.score
          sdsRank = managerSDS.rank
        }
      }
      
      managerStatsMap.get(ownerName)!.push({
        year,
        league_key: leagueKey,
        rank: team.rank,
        wins: team.wins || 0,
        losses: team.losses || 0,
        ties: team.ties || 0,
        points_for: team.points_for || 0,
        points_against: team.points_against || 0,
        sds_plus: sdsPlus,
        sds_rank: sdsRank,
      })
    })
  })
  
  // Convert to ManagerStats array
  const managerStats: ManagerStats[] = []
  
  managerNames.forEach(ownerName => {
    const seasons = managerStatsMap.get(ownerName) || []
    if (seasons.length === 0) return
    
    // Calculate all-time stats
    const championships = seasons.filter(s => s.rank === 1).length
    const total_wins = seasons.reduce((sum, s) => sum + s.wins, 0)
    const total_losses = seasons.reduce((sum, s) => sum + s.losses, 0)
    const total_ties = seasons.reduce((sum, s) => sum + s.ties, 0)
    const total_points_for = seasons.reduce((sum, s) => sum + s.points_for, 0)
    const total_points_against = seasons.reduce((sum, s) => sum + s.points_against, 0)
    const finishes = seasons.map(s => s.rank)
    const best_finish = Math.min(...finishes)
    const worst_finish = Math.max(...finishes)
    const avg_finish = finishes.reduce((a, b) => a + b, 0) / finishes.length
    
    // Calculate SDS+ stats from seasons
    const sdsScores = seasons.filter(s => s.sds_plus !== undefined).map(s => s.sds_plus!)
    const avg_sds_plus = sdsScores.length > 0
      ? Math.round((sdsScores.reduce((a, b) => a + b, 0) / sdsScores.length) * 10) / 10
      : undefined
    const high_sds_plus = sdsScores.length > 0 ? Math.max(...sdsScores) : undefined
    const low_sds_plus = sdsScores.length > 0 ? Math.min(...sdsScores) : undefined
    
    // Determine if manager is active
    const managerMostRecentYear = Math.max(...seasons.map(s => s.year))
    const is_active = managerMostRecentYear === mostRecentSeasonYear
    
    managerStats.push({
      owner_name: ownerName,
      seasons: seasons.sort((a, b) => b.year - a.year),
      all_time: {
        championships,
        total_wins,
        total_losses,
        total_ties,
        total_points_for,
        total_points_against,
        seasons_played: seasons.length,
        best_finish,
        worst_finish,
        avg_finish: Math.round(avg_finish * 10) / 10,
        avg_sds_plus,
        high_sds_plus,
        low_sds_plus,
      },
      is_active,
    })
  })
  
  const sortedStats = managerStats.sort((a, b) => a.owner_name.localeCompare(b.owner_name))
  
  // Cache the results for future requests (reuse import from top of function)
  await cacheManagerStats(sortedStats)
  
  return sortedStats
}

/**
 * Get lightweight manager stats (with SDS+ but skipping weekly scores) - for list views
 */
export async function getManagerStatsLightweight(ownerName: string): Promise<ManagerStats | null> {
  const leagues = await getAllLeaguesWithMetadata()
  const seasons: ManagerSeasonStats[] = []
  
  // Get the most recent season year from available leagues (not calendar year)
  const availableYears = leagues
    .map(l => parseInt(l.season) || 0)
    .filter(year => year > 0)
  const mostRecentSeasonYear = availableYears.length > 0 ? Math.max(...availableYears) : new Date().getFullYear()
  
  // Fetch standings for all leagues in parallel first
  const standingsPromises = leagues.map(async (league) => {
    const year = parseInt(league.season) || 0
    if (year === 0) return { league, year, standings: null }
    
    try {
      const standings = await fetchLeagueStandings(league.league_key)
      return { league, year, standings }
    } catch (error) {
      return { league, year, standings: null }
    }
  })
  
  const standingsResults = await Promise.all(standingsPromises)
  
  // Fetch SDS+ scores only for seasons where manager exists (skip weekly scores for performance)
  const seasonPromises = standingsResults.map(async ({ league, year, standings }) => {
    if (!standings) return null
    
    const managerTeam = standings.find(team => team.owner_name === ownerName)
    if (!managerTeam) return null
    
    // Fetch SDS+ scores (skip weekly scores for performance)
    let sdsPlus: number | undefined
    let sdsRank: number | undefined
    
    try {
      const sdsResult = await getSDSPlusScores(league.league_key, true) // Skip weekly scores
      if (sdsResult.success && sdsResult.data) {
        const managerSDS = sdsResult.data.find(s => s.owner === ownerName)
        if (managerSDS) {
          sdsPlus = managerSDS.score
          sdsRank = managerSDS.rank
        }
      }
    } catch (error) {
      // SDS+ calculation failed, continue without it
    }
    
    return {
      year,
      league_key: league.league_key,
      rank: managerTeam.rank,
      wins: managerTeam.wins || 0,
      losses: managerTeam.losses || 0,
      ties: managerTeam.ties || 0,
      points_for: managerTeam.points_for || 0,
      points_against: managerTeam.points_against || 0,
      sds_plus: sdsPlus,
      sds_rank: sdsRank,
    }
  })
  
  const results = await Promise.all(seasonPromises)
  const validSeasons = results.filter((s): s is ManagerSeasonStats => s !== null)
  seasons.push(...validSeasons)
  
  if (seasons.length === 0) {
    return null
  }
  
  // Calculate all-time stats
  const championships = seasons.filter(s => s.rank === 1).length
  const total_wins = seasons.reduce((sum, s) => sum + s.wins, 0)
  const total_losses = seasons.reduce((sum, s) => sum + s.losses, 0)
  const total_ties = seasons.reduce((sum, s) => sum + s.ties, 0)
  const total_points_for = seasons.reduce((sum, s) => sum + s.points_for, 0)
  const total_points_against = seasons.reduce((sum, s) => sum + s.points_against, 0)
  const finishes = seasons.map(s => s.rank)
  const best_finish = Math.min(...finishes)
  const worst_finish = Math.max(...finishes)
  const avg_finish = finishes.reduce((a, b) => a + b, 0) / finishes.length
  
  // Calculate SDS+ stats
  const sdsScores = seasons.filter(s => s.sds_plus !== undefined).map(s => s.sds_plus!)
  const avg_sds_plus = sdsScores.length > 0
    ? Math.round((sdsScores.reduce((a, b) => a + b, 0) / sdsScores.length) * 10) / 10
    : undefined
  const high_sds_plus = sdsScores.length > 0 ? Math.max(...sdsScores) : undefined
  const low_sds_plus = sdsScores.length > 0 ? Math.min(...sdsScores) : undefined
  
  // Determine if manager is active (played in most recent season)
  // Get the manager's most recent season year
  const managerMostRecentYear = seasons.length > 0 ? Math.max(...seasons.map(s => s.year)) : 0
  const is_active = managerMostRecentYear === mostRecentSeasonYear
  
  return {
    owner_name: ownerName,
    seasons: seasons.sort((a, b) => b.year - a.year),
    all_time: {
      championships,
      total_wins,
      total_losses,
      total_ties,
      total_points_for,
      total_points_against,
      seasons_played: seasons.length,
      best_finish,
      worst_finish,
      avg_finish: Math.round(avg_finish * 10) / 10,
      avg_sds_plus,
      high_sds_plus,
      low_sds_plus,
    },
    is_active,
  }
}

/**
 * Get manager stats across all seasons (full version with SDS+)
 */
export async function getManagerStats(ownerName: string): Promise<ManagerStats | null> {
  const leagues = await getAllLeaguesWithMetadata()
  const seasons: ManagerSeasonStats[] = []
  
  // Fetch standings for all leagues in parallel first
  const standingsPromises = leagues.map(async (league) => {
    const year = parseInt(league.season) || 0
    if (year === 0) return { league, year, standings: null }
    
    try {
      const standings = await fetchLeagueStandings(league.league_key)
      return { league, year, standings }
    } catch (error) {
      return { league, year, standings: null }
    }
  })
  
  const standingsResults = await Promise.all(standingsPromises)
  
  // Filter to only seasons where manager exists (before parallelizing SDS+ fetches)
  const managerSeasons = standingsResults
    .map(({ league, year, standings }) => {
      if (!standings) return null
      const managerTeam = standings.find(team => team.owner_name === ownerName)
      if (!managerTeam) return null
      return { league, year, standings, managerTeam }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
  
  // Fetch SDS+ scores in parallel for all seasons where manager exists
  const sdsPromises = managerSeasons.map(async ({ league, year, managerTeam }) => {
    // Fetch SDS+ scores for this season (skip weekly scores for performance)
    let sdsPlus: number | undefined
    let sdsRank: number | undefined
    
    try {
      // Skip weekly scores for performance (estimates are fine for individual pages)
      const sdsResult = await getSDSPlusScores(league.league_key, true)
      if (sdsResult.success && sdsResult.data) {
        const managerSDS = sdsResult.data.find(s => s.owner === ownerName)
        if (managerSDS) {
          sdsPlus = managerSDS.score
          sdsRank = managerSDS.rank
        }
      }
    } catch (error) {
      // SDS+ calculation failed, continue without it
    }
    
    return {
      year,
      league_key: league.league_key,
      rank: managerTeam.rank,
      wins: managerTeam.wins || 0,
      losses: managerTeam.losses || 0,
      ties: managerTeam.ties || 0,
      points_for: managerTeam.points_for || 0,
      points_against: managerTeam.points_against || 0,
      sds_plus: sdsPlus,
      sds_rank: sdsRank,
    }
  })
  
  const seasonResults = await Promise.all(sdsPromises)
  const validSeasons = seasonResults.filter((s): s is ManagerSeasonStats => s !== null)
  seasons.push(...validSeasons)
  
  if (seasons.length === 0) {
    return null
  }
  
  // Calculate all-time stats
  const championships = seasons.filter(s => s.rank === 1).length
  const total_wins = seasons.reduce((sum, s) => sum + s.wins, 0)
  const total_losses = seasons.reduce((sum, s) => sum + s.losses, 0)
  const total_ties = seasons.reduce((sum, s) => sum + s.ties, 0)
  const total_points_for = seasons.reduce((sum, s) => sum + s.points_for, 0)
  const total_points_against = seasons.reduce((sum, s) => sum + s.points_against, 0)
  const finishes = seasons.map(s => s.rank)
  const best_finish = Math.min(...finishes)
  const worst_finish = Math.max(...finishes)
  const avg_finish = finishes.reduce((a, b) => a + b, 0) / finishes.length
  
  // Calculate SDS+ stats
  const sdsScores = seasons.filter(s => s.sds_plus !== undefined).map(s => s.sds_plus!)
  const avg_sds_plus = sdsScores.length > 0
    ? Math.round((sdsScores.reduce((a, b) => a + b, 0) / sdsScores.length) * 10) / 10
    : undefined
  const high_sds_plus = sdsScores.length > 0 ? Math.max(...sdsScores) : undefined
  const low_sds_plus = sdsScores.length > 0 ? Math.min(...sdsScores) : undefined
  
  // Determine if manager is active (played in most recent season)
  // Get the most recent season year from available leagues
  const availableYears = leagues
    .map(l => parseInt(l.season) || 0)
    .filter(year => year > 0)
  const mostRecentSeasonYear = availableYears.length > 0 ? Math.max(...availableYears) : new Date().getFullYear()
  
  const managerMostRecentYear = seasons.length > 0 ? Math.max(...seasons.map(s => s.year)) : 0
  const is_active = managerMostRecentYear === mostRecentSeasonYear
  
  return {
    owner_name: ownerName,
    seasons: seasons.sort((a, b) => b.year - a.year), // Newest first
    all_time: {
      championships,
      total_wins,
      total_losses,
      total_ties,
      total_points_for,
      total_points_against,
      seasons_played: seasons.length,
      best_finish,
      worst_finish,
      avg_finish: Math.round(avg_finish * 10) / 10,
      avg_sds_plus,
      high_sds_plus,
      low_sds_plus,
    },
    is_active,
  }
}

/**
 * Get head-to-head records between two managers
 * Optimized: Parallel fetching and caching
 */
export async function getHeadToHeadRecord(
  manager1: string,
  manager2: string
): Promise<HeadToHeadRecord | null> {
  // Check cache first
  const { getCachedHeadToHead, cacheHeadToHead } = await import('@/lib/cache')
  const cachedRecord = await getCachedHeadToHead(manager1, manager2)
  if (cachedRecord) {
    return cachedRecord
  }
  
  const leagues = await getAllLeaguesWithMetadata()
  let wins = 0
  let losses = 0
  let ties = 0
  let points_for = 0
  let points_against = 0
  
  // Fetch all standings in parallel to check which leagues both managers are in
  const standingsPromises = leagues.map(async (league) => {
    try {
      const standings = await fetchLeagueStandings(league.league_key)
      const manager1InLeague = standings.some(s => s.owner_name === manager1)
      const manager2InLeague = standings.some(s => s.owner_name === manager2)
      return { league, standings, bothInLeague: manager1InLeague && manager2InLeague }
    } catch (error) {
      return { league, standings: null, bothInLeague: false }
    }
  })
  
  const standingsResults = await Promise.all(standingsPromises)
  
  // Filter to only leagues where both managers are present
  const relevantLeagues = standingsResults.filter(r => r.bothInLeague)
  
  // Fetch all weekly matchups in parallel for all relevant leagues
  // Use cached matchups when available - much faster!
  const { fetchWeekMatchups } = await import("./yahoo-api")
  const { getCachedMatchups } = await import("./cache")
  const { getYearFromLeagueKey } = await import("./owner-names")
  
  const matchupPromises = relevantLeagues.flatMap(({ league }) => {
    const yearNum = getYearFromLeagueKey(league.league_key)
    const year = yearNum?.toString() || new Date().getFullYear().toString()
    
    // Fetch all weeks 1-14 in parallel for this league
    // Try cache first, then API
    return Array.from({ length: 14 }, (_, i) => i + 1).map(async (week) => {
      try {
        // Check cache first
        const cached = await getCachedMatchups(league.league_key, year, week)
        if (cached && cached.length > 0) {
          return { league: league.league_key, week, matchups: cached }
        }
        
        // Not in cache, fetch from API
        const matchups = await fetchWeekMatchups(league.league_key, week)
        return { league: league.league_key, week, matchups }
      } catch (error) {
        return { league: league.league_key, week, matchups: [] }
      }
    })
  })
  
  const allMatchups = await Promise.all(matchupPromises)
  
  // Process all matchups
  allMatchups.forEach(({ matchups }) => {
    const matchup = matchups.find(m => {
      const team1Owner = m.team1?.owner_name
      const team2Owner = m.team2?.owner_name
      
      return (
        (team1Owner === manager1 && team2Owner === manager2) ||
        (team1Owner === manager2 && team2Owner === manager1)
      )
    })
    
    if (matchup) {
      const team1Owner = matchup.team1?.owner_name
      const team1Points = matchup.team1?.points || 0
      const team2Points = matchup.team2?.points || 0
      
      if (team1Owner === manager1) {
        points_for += team1Points
        points_against += team2Points
        
        if (team1Points > team2Points) wins++
        else if (team1Points < team2Points) losses++
        else ties++
      } else {
        points_for += team2Points
        points_against += team1Points
        
        if (team2Points > team1Points) wins++
        else if (team2Points < team1Points) losses++
        else ties++
      }
    }
  })
  
  const total_games = wins + losses + ties
  
  if (total_games === 0) {
    return null
  }
  
  const record: HeadToHeadRecord = {
    opponent: manager2,
    wins,
    losses,
    ties,
    total_games,
    points_for,
    points_against,
  }
  
  // Cache the result for future requests
  await cacheHeadToHead(manager1, manager2, record)
  
  return record
}

/**
 * Get all head-to-head records for a manager
 * Optimized: Parallel fetching for all opponents
 */
export async function getAllHeadToHeadRecords(ownerName: string): Promise<HeadToHeadRecord[]> {
  const allManagers = await getAllManagers()
  const opponents = allManagers.filter(m => m !== ownerName)
  
  // Fetch head-to-head for all opponents in parallel
  const recordPromises = opponents.map(opponent => 
    getHeadToHeadRecord(ownerName, opponent)
  )
  
  const results = await Promise.all(recordPromises)
  const records = results.filter((r): r is HeadToHeadRecord => r !== null)
  
  // Sort by total games (most frequent matchups first), then by win percentage
  return records.sort((a, b) => {
    const aWinPct = a.total_games > 0 ? a.wins / a.total_games : 0
    const bWinPct = b.total_games > 0 ? b.wins / b.total_games : 0
    
    if (a.total_games !== b.total_games) {
      return b.total_games - a.total_games
    }
    return bWinPct - aWinPct
  })
}
