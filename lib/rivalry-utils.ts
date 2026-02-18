/**
 * Utility functions for calculating top rivalries
 */

import { getAllManagers, getHeadToHeadRecord, HeadToHeadRecord } from "./manager-utils"

export interface TopRivalry {
  manager1: string
  manager2: string
  wins: number
  losses: number
  ties: number
  total_games: number
  points_for: number
  points_against: number
  competitiveness_score: number // Higher = more competitive (closer records, more games)
}

/**
 * Calculate competitiveness score for a rivalry
 * Factors:
 * - Number of games (more games = higher score)
 * - Closeness of record (closer to .500 = higher score)
 * - Point differential (closer to 0 = more competitive)
 */
function calculateCompetitivenessScore(record: {
  wins: number
  losses: number
  ties: number
  total_games: number
  points_for: number
  points_against: number
}): number {
  const { wins, losses, ties, total_games, points_for, points_against } = record

  if (total_games === 0) return 0

  // Win percentage closeness to 0.5 (perfectly competitive)
  const winPct = wins / total_games
  const closenessTo500 = 1 - Math.abs(winPct - 0.5) * 2 // 0 to 1, where 1 is perfectly balanced

  // Point differential normalized (closer to 0 = more competitive)
  const pointDiff = Math.abs(points_for - points_against)
  const avgPoints = (points_for + points_against) / 2
  const normalizedDiff = avgPoints > 0 ? 1 - Math.min(pointDiff / avgPoints, 1) : 0

  // Game count factor (more games = more significant rivalry)
  const gameFactor = Math.min(total_games / 20, 1) // Normalize to max 20 games

  // Weighted score
  return (
    gameFactor * 0.4 + // 40% weight on number of games
    closenessTo500 * 0.4 + // 40% weight on record closeness
    normalizedDiff * 0.2 // 20% weight on point differential
  )
}

/**
 * Get top rivalries across all managers
 * Returns the most competitive matchups based on games played, record closeness, and point differential
 * Optimized: Only returns cached records for fast initial load
 * Uncached records will be populated on-demand or via background job
 */
export async function getTopRivalries(limit: number = 10, cachedOnly: boolean = true): Promise<TopRivalry[]> {
  const allManagers = await getAllManagers()
  
  // Get head-to-head records for all manager pairs
  // Only check each pair once (manager1 < manager2 alphabetically)
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < allManagers.length; i++) {
    for (let j = i + 1; j < allManagers.length; j++) {
      pairs.push([allManagers[i], allManagers[j]])
    }
  }

  // Batch fetch all cached records in one query (much faster!)
  const { getCachedHeadToHeadBatch } = await import('@/lib/cache')
  const cachedRecords = await getCachedHeadToHeadBatch(pairs)
  
  // Only use cached records for fast loading
  // Uncached records will be populated later via background job or on-demand
  const validRivalries: TopRivalry[] = []
  
  for (const [m1, m2] of pairs) {
    const [n1, n2] = [m1, m2].sort()
    const cacheKey = `${n1}|${n2}`
    
    const cached = cachedRecords.get(cacheKey)
    if (cached) {
      validRivalries.push({
        manager1: m1,
        manager2: m2,
        ...cached,
        competitiveness_score: calculateCompetitivenessScore(cached),
      })
    } else if (!cachedOnly) {
      // Only fetch uncached if explicitly requested (slower)
      const record = await getHeadToHeadRecord(m1, m2)
      if (record) {
        validRivalries.push({
          manager1: m1,
          manager2: m2,
          ...record,
          competitiveness_score: calculateCompetitivenessScore(record),
        })
      }
    }
  }

  // Sort by competitiveness score (highest first), then by total games
  validRivalries.sort((a, b) => {
    if (Math.abs(a.competitiveness_score - b.competitiveness_score) > 0.01) {
      return b.competitiveness_score - a.competitiveness_score
    }
    return b.total_games - a.total_games
  })

  return validRivalries.slice(0, limit)
}

/**
 * Get top rivalries for a specific manager
 * Returns their most competitive matchups
 */
export async function getTopRivalriesForManager(ownerName: string, limit: number = 10): Promise<TopRivalry[]> {
  const allManagers = await getAllManagers()
  const opponents = allManagers.filter(m => m !== ownerName)
  
  // Batch fetch all cached records for this manager
  const pairs: Array<[string, string]> = opponents.map(opponent => [ownerName, opponent])
  const { getCachedHeadToHeadBatch } = await import('@/lib/cache')
  const cachedRecords = await getCachedHeadToHeadBatch(pairs)
  
  // Process pairs: use cached if available, otherwise fetch
  const recordPromises = pairs.map(async ([m1, m2]) => {
    const [n1, n2] = [m1, m2].sort()
    const cacheKey = `${n1}|${n2}`
    
    // Check cache first
    const cached = cachedRecords.get(cacheKey)
    if (cached) {
      return {
        manager1: m1,
        manager2: m2,
        ...cached,
        competitiveness_score: calculateCompetitivenessScore(cached),
      }
    }
    
    // Not in cache, fetch it (will cache automatically)
    const record = await getHeadToHeadRecord(m1, m2)
    if (!record) return null
    
    return {
      manager1: m1,
      manager2: m2,
      ...record,
      competitiveness_score: calculateCompetitivenessScore(record),
    }
  })

  const results = await Promise.all(recordPromises)
  const validRivalries = results.filter((r): r is TopRivalry => r !== null)

  // Sort by competitiveness score (highest first), then by total games
  validRivalries.sort((a, b) => {
    if (Math.abs(a.competitiveness_score - b.competitiveness_score) > 0.01) {
      return b.competitiveness_score - a.competitiveness_score
    }
    return b.total_games - a.total_games
  })

  return validRivalries.slice(0, limit)
}
