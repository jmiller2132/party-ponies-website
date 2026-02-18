/**
 * Season Success Metric
 * 
 * A composite metric that measures overall season success beyond just championship wins.
 * Recognizes that sometimes the "best" team doesn't win due to playoff variance.
 * 
 * Metric Name Options:
 * - PONIES Score: Performance Overall Net Impact Evaluation Score (fun, league-specific!)
 * - POWER Rating: Performance Overall Win Evaluation Rating
 * - DOMINANCE: Dynamic Overall Metric Integrating All Notable Achievements
 * - LEGACY Score: League Excellence Grade Across Championship Years
 * - CHAMP Score: Championship Achievement Metric & Performance
 * - ELITE Rating: Excellence Level In Total Evaluation
 */

import { YahooStanding } from './yahoo-api'

export interface SeasonSuccessScore {
  owner: string
  team_key: string
  score: number
  breakdown: {
    championship: number
    playoffFinish: number
    regularSeason: number
    pointsScored: number
    consistency: number
  }
  rank: number
  finalRank: number // Final standings rank
}

/**
 * Calculate PONIES Score (Performance Overall Net Impact Evaluation Score)
 * 
 * Revised formula that heavily weights points scored while still rewarding championships.
 * Inspired by: ((points_per_game * 6) + ((high_week + low_week) * 2) + (win_pct * 400)) / 10
 * 
 * New scoring breakdown:
 * - Points per game: * 6 (dominant factor - shows best teams)
 * - Championship bonus: +40 points (still matters, but doesn't override everything)
 * - Runner-up: +20 points
 * - 3rd place: +10 points
 * - 4th place: +5 points
 * - Regular season wins: 1.5 points each
 * - Win percentage: * 400 / 10 = * 40 (full season, not just regular season)
 * 
 * This ensures teams with high point totals can beat champions with weaker regular seasons.
 */
export function calculatePONIESScore(standings: YahooStanding[]): SeasonSuccessScore[] {
  const totalTeams = standings.length
  
  // Calculate points per game for all teams
  const teamsWithPPG = standings.map(team => {
    const gamesPlayed = team.wins + team.losses + team.ties
    const pointsPerGame = gamesPlayed > 0 ? team.points_for / gamesPlayed : 0
    return { ...team, pointsPerGame }
  })
  
  // Find min/max PPG for normalization (optional - or use raw PPG)
  const maxPPG = Math.max(...teamsWithPPG.map(t => t.pointsPerGame))
  const minPPG = Math.min(...teamsWithPPG.map(t => t.pointsPerGame))
  const ppgRange = maxPPG - minPPG || 1 // Avoid division by zero
  
  return teamsWithPPG.map(team => {
    const finalRank = team.rank
    const gamesPlayed = team.wins + team.losses + team.ties
    const winPct = gamesPlayed > 0 ? team.wins / gamesPlayed : 0
    
    // Points per game component (dominant factor)
    // Normalize to 0-100 scale, then multiply by 6
    // This gives teams with high PPG a huge advantage
    const normalizedPPG = ppgRange > 0 ? ((team.pointsPerGame - minPPG) / ppgRange) * 100 : 0
    const pointsPerGameScore = normalizedPPG * 0.6 // Scaled to be dominant but reasonable
    
    // Championship/Playoff finish bonus (still matters, but smaller)
    let championship = 0
    let playoffFinish = 0
    
    if (finalRank === 1) {
      championship = 40 // Champion bonus (reduced from 100)
    } else if (finalRank === 2) {
      playoffFinish = 20 // Runner-up
    } else if (finalRank === 3) {
      playoffFinish = 10 // 3rd place
    } else if (finalRank === 4) {
      playoffFinish = 5 // 4th place
    }
    
    // Regular season wins (1.5 points each)
    const regularSeason = team.wins * 1.5
    
    // Win percentage component (full season, not just regular season)
    // winPct * 40 (scaled from the original * 400 / 10)
    const winPercentageScore = winPct * 40
    
    // Total score
    const totalScore = pointsPerGameScore + championship + playoffFinish + regularSeason + winPercentageScore
    
    return {
      owner: team.owner_name || team.name,
      team_key: team.team_key,
      score: Math.round(totalScore * 10) / 10, // Round to 1 decimal
      breakdown: {
        championship,
        playoffFinish,
        regularSeason: Math.round(regularSeason * 10) / 10,
        pointsScored: Math.round(pointsPerGameScore * 10) / 10,
        consistency: Math.round(winPercentageScore * 10) / 10,
      },
      rank: 0, // Will be set after sorting
      finalRank,
    }
  }).sort((a, b) => b.score - a.score)
    .map((score, index) => ({
      ...score,
      rank: index + 1,
    }))
}

/**
 * Alternative: POWER Rating (Performance Overall Win Evaluation Rating)
 * 
 * Slightly different weighting - emphasizes regular season performance more
 */
export function calculatePOWERRating(standings: YahooStanding[]): SeasonSuccessScore[] {
  const totalTeams = standings.length
  
  return standings.map(team => {
    const finalRank = team.rank
    const gamesPlayed = team.wins + team.losses + team.ties
    const winPct = gamesPlayed > 0 ? team.wins / gamesPlayed : 0
    
    // Championship/Playoff finish (slightly less weight)
    let championship = 0
    let playoffFinish = 0
    
    if (finalRank === 1) {
      championship = 80 // Still most important, but less dominant
    } else if (finalRank === 2) {
      playoffFinish = 40
    } else if (finalRank === 3) {
      playoffFinish = 20
    } else if (finalRank === 4) {
      playoffFinish = 12
    } else if (finalRank <= 6) {
      playoffFinish = 8
    }
    
    // Regular season wins (3 points each - more weight)
    const regularSeason = team.wins * 3
    
    // Points scored ranking
    const sortedByPoints = [...standings].sort((a, b) => b.points_for - a.points_for)
    const pointsRank = sortedByPoints.findIndex(t => t.team_key === team.team_key) + 1
    const pointsScored = Math.max(0, (totalTeams - pointsRank + 1) * 3) // Up to 30 points
    
    // Win percentage bonus
    const consistency = winPct * 25 // Up to 25 points
    
    const totalScore = championship + playoffFinish + regularSeason + pointsScored + consistency
    
    return {
      owner: team.owner_name || team.name,
      team_key: team.team_key,
      score: Math.round(totalScore * 10) / 10,
      breakdown: {
        championship,
        playoffFinish,
        regularSeason,
        pointsScored: Math.round(pointsScored * 10) / 10,
        consistency: Math.round(consistency * 10) / 10,
      },
      rank: 0,
      finalRank,
    }
  }).sort((a, b) => b.score - a.score)
    .map((score, index) => ({
      ...score,
      rank: index + 1,
    }))
}

/**
 * Get metric name and description
 */
export function getMetricInfo(metricType: 'ponies' | 'power' = 'ponies') {
  if (metricType === 'ponies') {
    return {
      name: 'PONIES Score',
      fullName: 'Performance Overall Net Impact Evaluation Score',
      description: 'A composite metric that heavily weights points scored (showing the best teams) while still rewarding championships. Points per game is the dominant factor.',
      maxScore: '~200+ points',
    }
  } else {
    return {
      name: 'POWER Rating',
      fullName: 'Performance Overall Win Evaluation Rating',
      description: 'A balanced metric that emphasizes both playoff success and regular season performance.',
      maxScore: '~200+ points',
    }
  }
}
