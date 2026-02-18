/**
 * SDS+ (Season Dominance Score Plus)
 * 
 * A luck-adjusted dominance metric designed to compare individual seasons across different years.
 * Prioritizes true performance (scoring strength, consistency, all-play dominance) over playoff variance,
 * while still granting limited credit for postseason results.
 * 
 * Reference: User-provided formula specification
 */

import { YahooStanding } from './yahoo-api'

export interface SDSPlusScore {
  owner: string
  team_key: string
  score: number
  breakdown: {
    pfIndexEra: number
    allPlayWinPct: number
    regularSeasonScore: number
    weeklyCeilingRate: number
    strengthOfSchedule: number
    consistencyIndex: number
    postseasonBonus: number
    playoffLuckDiff: number
  }
  rank: number
  finalRank: number
  interpretation: string
}

interface WeeklyScore {
  team_key: string
  week: number
  points: number
  opponent_key?: string // Track opponent for SoS calculation
}

/**
 * Calculate All-Play Win Percentage
 * For each week, count how many teams you beat (your score > their score)
 * APW = (total wins across all weeks) / (total possible matchups)
 */
function calculateAllPlayWinPercentage(
  teamKey: string,
  weeklyScores: WeeklyScore[],
  allTeamKeys: string[]
): number {
  const teamWeeks = weeklyScores.filter(w => w.team_key === teamKey)
  if (teamWeeks.length === 0) return 0.5 // Default to .500 if no data

  let totalWins = 0
  let totalMatchups = 0

  // Group scores by week
  const scoresByWeek = new Map<number, Map<string, number>>()
  weeklyScores.forEach(ws => {
    if (!scoresByWeek.has(ws.week)) {
      scoresByWeek.set(ws.week, new Map())
    }
    scoresByWeek.get(ws.week)!.set(ws.team_key, ws.points)
  })

  // For each week this team played, count wins against all other teams
  teamWeeks.forEach(teamWeek => {
    const weekScores = scoresByWeek.get(teamWeek.week)
    if (!weekScores) return

    const teamScore = teamWeek.points
    allTeamKeys.forEach(opponentKey => {
      if (opponentKey !== teamKey) {
        const opponentScore = weekScores.get(opponentKey) || 0
        if (teamScore > opponentScore) {
          totalWins++
        }
        totalMatchups++
      }
    })
  })

  return totalMatchups > 0 ? totalWins / totalMatchups : 0.5
}

/**
 * Calculate weekly standard deviation for a team
 */
function calculateTeamStdDev(teamKey: string, weeklyScores: WeeklyScore[]): number {
  const teamScores = weeklyScores
    .filter(w => w.team_key === teamKey)
    .map(w => w.points)
  
  if (teamScores.length === 0) return 0

  const mean = teamScores.reduce((a, b) => a + b, 0) / teamScores.length
  const variance = teamScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / teamScores.length
  return Math.sqrt(variance)
}

/**
 * Calculate average all-play win percentage of opponents
 * Now uses actual opponents from weekly matchups
 */
function calculateOpponentAPW(
  teamKey: string,
  weeklyScores: WeeklyScore[],
  allTeamKeys: string[],
  allPlayWinPcts: Map<string, number>
): number {
  // Get all opponents this team faced during the regular season
  const teamWeeklyScores = weeklyScores.filter(ws => ws.team_key === teamKey && ws.opponent_key)
  
  if (teamWeeklyScores.length === 0) {
    // Fallback: if no opponent data, use league average
    const allAPWs = Array.from(allPlayWinPcts.values())
    return allAPWs.length > 0 
      ? allAPWs.reduce((a, b) => a + b, 0) / allAPWs.length 
      : 0.5
  }
  
  // Get unique opponents (a team might face the same opponent multiple times)
  const opponentKeys = new Set<string>()
  teamWeeklyScores.forEach(ws => {
    if (ws.opponent_key) {
      opponentKeys.add(ws.opponent_key)
    }
  })
  
  // Calculate average APW of opponents
  const opponentAPWs: number[] = []
  opponentKeys.forEach(opponentKey => {
    const opponentAPW = allPlayWinPcts.get(opponentKey)
    if (opponentAPW !== undefined) {
      opponentAPWs.push(opponentAPW)
    }
  })
  
  // If we have opponent APWs, return their average
  // Otherwise fall back to league average
  if (opponentAPWs.length > 0) {
    return opponentAPWs.reduce((a, b) => a + b, 0) / opponentAPWs.length
  }
  
  // Fallback to league average
  const allAPWs = Array.from(allPlayWinPcts.values())
  return allAPWs.length > 0 
    ? allAPWs.reduce((a, b) => a + b, 0) / allAPWs.length 
    : 0.5
}

/**
 * Calculate Expected Playoff Wins based on regular season performance
 * Simplified: Use regular season rank and all-play win percentage
 */
function calculateExpectedPlayoffWins(
  regularSeasonRank: number,
  allPlayWinPct: number,
  numPlayoffTeams: number = 6
): number {
  // Teams ranked 1-2 get higher expected wins
  if (regularSeasonRank <= 2) {
    return 1.5 + (allPlayWinPct * 0.5) // 1.5-2.0 expected wins
  } else if (regularSeasonRank <= 4) {
    return 1.0 + (allPlayWinPct * 0.5) // 1.0-1.5 expected wins
  } else {
    return 0.5 + (allPlayWinPct * 0.5) // 0.5-1.0 expected wins
  }
}

/**
 * Calculate Actual Playoff Wins from final rank
 */
function calculateActualPlayoffWins(finalRank: number): number {
  if (finalRank === 1) return 2 // Champion (won 2 playoff games)
  if (finalRank === 2) return 1 // Runner-up (won 1 playoff game)
  if (finalRank === 3) return 1 // 3rd place (won 1 playoff game)
  return 0
}

/**
 * Calculate Weekly Ceiling Rate (WHS / W)
 * For now, we'll use highest weekly score from available data
 */
function calculateWeeklyCeilingRate(
  teamKey: string,
  weeklyScores: WeeklyScore[],
  regularSeasonWeeks: number
): number {
  const teamScores = weeklyScores
    .filter(w => w.team_key === teamKey)
    .map(w => w.points)
  
  if (teamScores.length === 0) return 0
  
  const weeklyHigh = Math.max(...teamScores)
  return regularSeasonWeeks > 0 ? weeklyHigh / regularSeasonWeeks : 0
}

/**
 * Calculate SDS+ (Season Dominance Score Plus)
 * 
 * Note: This requires weekly scoring data which we'll need to fetch.
 * For now, we'll calculate what we can from standings and make reasonable estimates.
 */
export function calculateSDSPlus(
  standings: YahooStanding[],
  weeklyScores: WeeklyScore[] = [], // Optional: weekly scores if available
  regularSeasonWeeks: number = 14 // Default to 14 weeks
): SDSPlusScore[] {
  const N = standings.length // Number of teams
  
  // Calculate league average points
  const leagueAvgPoints = standings.reduce((sum, team) => sum + team.points_for, 0) / N
  
  // Sort by points for to get percentile ranks
  const sortedByPoints = [...standings].sort((a, b) => b.points_for - a.points_for)
  
  // Calculate all-play win percentages (if we have weekly data)
  const allPlayWinPcts = new Map<string, number>()
  const allTeamKeys = standings.map(t => t.team_key)
  
  if (weeklyScores.length > 0) {
    allTeamKeys.forEach(teamKey => {
      const apw = calculateAllPlayWinPercentage(teamKey, weeklyScores, allTeamKeys)
      allPlayWinPcts.set(teamKey, apw)
    })
  } else {
    // Estimate APW from win percentage (rough approximation)
    allTeamKeys.forEach(teamKey => {
      const team = standings.find(t => t.team_key === teamKey)
      if (team) {
        const gamesPlayed = team.wins + team.losses + team.ties
        const winPct = gamesPlayed > 0 ? team.wins / gamesPlayed : 0.5
        // Rough estimate: APW is usually higher than win% for good teams
        allPlayWinPcts.set(teamKey, Math.min(0.95, winPct * 1.1))
      }
    })
  }
  
  // Calculate league average std dev
  // Only calculate if we have weekly scores, otherwise skip CI calculation
  let leagueAvgStdDev = 0
  if (weeklyScores.length > 0) {
    const teamStdDevs: number[] = []
    allTeamKeys.forEach(teamKey => {
      const stdDev = calculateTeamStdDev(teamKey, weeklyScores)
      if (stdDev > 0) {
        teamStdDevs.push(stdDev)
      }
    })
    leagueAvgStdDev = teamStdDevs.length > 0 
      ? teamStdDevs.reduce((a, b) => a + b, 0) / teamStdDevs.length 
      : 0
  }
  
  // Calculate regular season rank (by wins, then points)
  const sortedByRegularSeason = [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.points_for - a.points_for
  })
  
  return standings.map(team => {
    const finalRank = team.rank // Final playoff rank
    const gamesPlayed = team.wins + team.losses + team.ties
    
    // Regular Season Rank (RS) - based on regular season record
    const regularSeasonRank = sortedByRegularSeason.findIndex(t => t.team_key === team.team_key) + 1
    
    // Points Index
    const PFI = team.points_for / leagueAvgPoints
    
    // Percentile rank of PF
    const pointsRank = sortedByPoints.findIndex(t => t.team_key === team.team_key) + 1
    const PF_pct = 1 - (pointsRank - 1) / (N - 1)
    
    // Era-Adjusted Points
    const PFI_era = 0.5 * PFI + 0.5 * PF_pct
    
    // Regular Season Score (RSS = 1 - (RS-1)/(N-1))
    const RSS = 1 - (regularSeasonRank - 1) / (N - 1)
    
    // All-Play Win Percentage
    const APW = allPlayWinPcts.get(team.team_key) || 0.5
    
    // Weekly Ceiling Rate (WHS / W)
    // WHS = Weekly High Score (highest single week score)
    // W = Regular Season Weeks
    // Note: WCR should be normalized - using points per game as proxy if no weekly data
    const teamWeeklyScores = weeklyScores.filter(w => w.team_key === team.team_key).map(w => w.points)
    const weeklyHigh = teamWeeklyScores.length > 0
      ? Math.max(...teamWeeklyScores)
      : (team.points_for / gamesPlayed) * 1.5 // Estimate: 1.5x average if no weekly data
    
    // Normalize WCR: divide by league average weekly score to get a ratio
    const leagueAvgWeeklyScore = weeklyScores.length > 0 && allTeamKeys.length > 0
      ? weeklyScores.reduce((sum, ws) => sum + ws.points, 0) / weeklyScores.length
      : leagueAvgPoints / regularSeasonWeeks
    
    // WCR as a ratio (normalized)
    const WCR = leagueAvgWeeklyScore > 0 ? weeklyHigh / leagueAvgWeeklyScore : 1.0
    
    // Strength of Schedule - uses actual opponents from weekly matchups
    // Tracks which teams each team faced and calculates average opponent APW
    const APW_opp = calculateOpponentAPW(team.team_key, weeklyScores, allTeamKeys, allPlayWinPcts)
    const SoS = 1 + (APW_opp - 0.50)
    
    // SoS now differentiates teams based on actual schedule difficulty
    // Teams with harder schedules (faced stronger opponents) get SoS > 1.0
    // Teams with easier schedules (faced weaker opponents) get SoS < 1.0
    
    // Consistency Index
    // Only calculated if weekly scores are available
    // When weekly scores are missing (comparison page), CI defaults to 0 (no bonus/penalty)
    let CI = 0
    if (weeklyScores.length > 0 && leagueAvgStdDev > 0) {
      const teamStdDev = calculateTeamStdDev(team.team_key, weeklyScores)
      if (teamStdDev > 0 && leagueAvgStdDev > 0) {
        CI = 1 - (teamStdDev / leagueAvgStdDev)
        // Clamp CI to reasonable range (-1 to 1)
        CI = Math.max(-1, Math.min(1, CI))
      }
    }
    
    // Postseason Bonus
    let PSB = 0
    if (finalRank === 1) PSB = 1.00
    else if (finalRank === 2) PSB = 0.70
    else if (finalRank === 3) PSB = 0.45
    else PSB = 0.00
    
    // Expected vs Actual Playoff Wins
    // Use regular season rank for expected wins calculation
    const EPW = calculateExpectedPlayoffWins(regularSeasonRank, APW)
    const APW_act = calculateActualPlayoffWins(finalRank)
    const LD = EPW - APW_act
    
    // Adjusted Postseason Bonus
    const PSB_adj = PSB + 0.05 * LD
    
    // Final SDS+ Calculation
    // Increased weight on postseason results: champions get a multiplier boost
    // This ensures that winning the championship is properly rewarded
    const baseScore = (0.30 * PFI_era + 0.25 * APW + 0.15 * RSS + 0.10 * WCR) * SoS + 0.20 * PSB_adj
    
    // Champion multiplier: Champions get a 1.15x multiplier to ensure they rank highly
    // This addresses cases where a champion with strong but not dominant regular season
    // should still rank above non-champions with slightly better regular season stats
    const championMultiplier = finalRank === 1 ? 1.15 : 1.0
    
    const sdsPlus = 100 * baseScore * (1 + 0.05 * CI) * championMultiplier
    
    // Interpretation
    let interpretation = ""
    if (sdsPlus >= 95) interpretation = "All-time, era-defining season"
    else if (sdsPlus >= 85) interpretation = "Dominant, likely robbed by variance"
    else if (sdsPlus >= 75) interpretation = "Elite champion or contender"
    else if (sdsPlus >= 65) interpretation = "Solid title or strong season"
    else interpretation = "Average or luck-driven outcome"
    
    return {
      owner: team.owner_name || team.name,
      team_key: team.team_key,
      score: Math.round(sdsPlus * 10) / 10,
      breakdown: {
        pfIndexEra: Math.round(PFI_era * 100) / 100,
        allPlayWinPct: Math.round(APW * 1000) / 1000,
        regularSeasonScore: Math.round(RSS * 100) / 100,
        weeklyCeilingRate: Math.round(WCR * 100) / 100,
        strengthOfSchedule: Math.round(SoS * 100) / 100,
        consistencyIndex: Math.round(CI * 100) / 100,
        postseasonBonus: Math.round(PSB_adj * 100) / 100,
        playoffLuckDiff: Math.round(LD * 100) / 100,
      },
      rank: 0, // Will be set after sorting
      finalRank,
      interpretation,
    }
  }).sort((a, b) => b.score - a.score)
    .map((score, index) => ({
      ...score,
      rank: index + 1,
    }))
}

/**
 * Get metric info
 */
export function getSDSPlusInfo() {
  return {
    name: 'SDS+',
    fullName: 'Season Dominance Score Plus',
    description: 'A luck-adjusted dominance metric that prioritizes true performance (scoring strength, consistency, all-play dominance) over playoff variance, while still granting limited credit for postseason results.',
    maxScore: '100+ (95+ = all-time season)',
  }
}
