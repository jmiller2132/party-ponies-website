/**
 * PPSI (Party Ponies Season Index)
 *
 * A three-pillar metric for comparing individual fantasy football seasons across
 * different years. Designed from scratch to reward true performance over schedule luck.
 *
 * PILLAR 1 — Dominance (0–50 pts)
 *   All-Play Win% × 50
 *   How often you beat every other team in any given week. Completely schedule-neutral.
 *
 * PILLAR 2 — Era-Adjusted Scoring (0–55+ pts)
 *   Blend of PF/league_avg (absolute) and within-season scoring percentile (relative).
 *   Normalizes scoring across years where league-wide totals differ.
 *
 * PILLAR 3 — Schedule Luck Adjustment (−7 to +7 pts)
 *   (APW − actual_win%) × 15
 *   Positive for teams whose dominance outpaced their record (drew tough matchups).
 *   Negative for teams whose record outpaced their dominance (got easy draws).
 *
 * PILLAR 4 — Season Result (0–30 pts)
 *   Champion: 30 | Runner-up: 18 | 3rd: 10 | 4th: 4 | Missed: 0
 *   Playoff result matters — but no multipliers or hidden bonuses.
 *
 * Typical total range: ~30 (bad miss) to ~130 (all-time dominant champion).
 */

import { YahooStanding } from './yahoo-api'

export interface PPSIScore {
  owner: string
  team_key: string
  score: number
  breakdown: {
    dominance: number       // APW × 50 (0–50)
    scoring: number         // Era-adjusted points (0–55+)
    scheduleLuck: number    // (APW − win%) × 15 (±7)
    seasonResult: number    // Playoff finish bonus (0–30)
  }
  dominanceRate: number     // Raw APW (0–1)
  scoringIndex: number      // Raw PF / league avg PF
  rank: number              // PPSI rank (1 = best season)
  finalRank: number         // Actual playoff finish
  interpretation: string
}

export type SDSPlusScore = PPSIScore

interface WeeklyScore {
  team_key: string
  week: number
  points: number
  opponent_key?: string
}

/**
 * All-Play Win Percentage:
 * Each week, count how many teams you beat. APW = total beats / total possible matchups.
 */
function calculateAllPlayWinPercentage(
  teamKey: string,
  weeklyScores: WeeklyScore[],
  allTeamKeys: string[]
): number {
  const teamWeeks = weeklyScores.filter(w => w.team_key === teamKey)
  if (teamWeeks.length === 0) return 0.5

  const scoresByWeek = new Map<number, Map<string, number>>()
  weeklyScores.forEach(ws => {
    if (!scoresByWeek.has(ws.week)) scoresByWeek.set(ws.week, new Map())
    scoresByWeek.get(ws.week)!.set(ws.team_key, ws.points)
  })

  let totalWins = 0
  let totalMatchups = 0

  teamWeeks.forEach(teamWeek => {
    const weekScores = scoresByWeek.get(teamWeek.week)
    if (!weekScores) return
    allTeamKeys.forEach(opponentKey => {
      if (opponentKey !== teamKey) {
        if (teamWeek.points > (weekScores.get(opponentKey) ?? 0)) totalWins++
        totalMatchups++
      }
    })
  })

  return totalMatchups > 0 ? totalWins / totalMatchups : 0.5
}

/**
 * Calculate PPSI scores for all teams in a season.
 */
export function calculatePPSI(
  standings: YahooStanding[],
  weeklyScores: WeeklyScore[] = [],
  regularSeasonWeeks: number = 14
): PPSIScore[] {
  const N = standings.length
  const allTeamKeys = standings.map(t => t.team_key)

  // League average points for era-adjustment
  const avgPF = standings.reduce((sum, t) => sum + t.points_for, 0) / N

  // Sorted by points for percentile ranking
  const sortedByPoints = [...standings].sort((a, b) => b.points_for - a.points_for)

  // All-Play Win% for each team
  const allPlayWinPcts = new Map<string, number>()
  if (weeklyScores.length > 0) {
    allTeamKeys.forEach(teamKey => {
      allPlayWinPcts.set(teamKey, calculateAllPlayWinPercentage(teamKey, weeklyScores, allTeamKeys))
    })
  } else {
    // Fallback: use actual win% when no weekly data available
    allTeamKeys.forEach(teamKey => {
      const team = standings.find(t => t.team_key === teamKey)
      if (team) {
        const games = team.wins + team.losses + team.ties
        allPlayWinPcts.set(teamKey, games > 0 ? team.wins / games : 0.5)
      }
    })
  }

  const scored = standings.map(team => {
    const games = team.wins + team.losses + team.ties
    const actualWinPct = games > 0 ? team.wins / games : 0.5
    const apw = allPlayWinPcts.get(team.team_key) ?? 0.5

    // Pillar 1: Dominance
    const dominance = apw * 50

    // Pillar 2: Era-Adjusted Scoring
    //   pfRatio: how your scoring compares to league average this year
    //   scoringPct: where you rank among peers this season (1.0 = top scorer)
    const pfRatio = avgPF > 0 ? team.points_for / avgPF : 1.0
    const pointsRank = sortedByPoints.findIndex(t => t.team_key === team.team_key) + 1
    const scoringPct = N > 1 ? 1 - (pointsRank - 1) / (N - 1) : 1.0
    const scoring = pfRatio * 25 + scoringPct * 25

    // Pillar 3: Schedule Luck Adjustment
    //   Positive = APW outpaced record → you were unlucky (faced tough matchups)
    //   Negative = record outpaced APW → you were lucky (faced weaker matchups)
    const scheduleLuck = (apw - actualWinPct) * 15

    // Pillar 4: Season Result
    let seasonResult = 0
    if (team.rank === 1) seasonResult = 30
    else if (team.rank === 2) seasonResult = 18
    else if (team.rank === 3) seasonResult = 10
    else if (team.rank === 4) seasonResult = 4

    const rawScore = dominance + scoring + scheduleLuck + seasonResult
    const score = Math.round(rawScore * 10) / 10

    let interpretation = ''
    if (score >= 110) interpretation = 'All-time, generational season'
    else if (score >= 95) interpretation = 'Elite — dominant team or dominant result'
    else if (score >= 80) interpretation = 'Very good season'
    else if (score >= 65) interpretation = 'Solid, above-average season'
    else interpretation = 'Below average season'

    return {
      owner: team.owner_name || team.name,
      team_key: team.team_key,
      score,
      breakdown: {
        dominance: Math.round(dominance * 10) / 10,
        scoring: Math.round(scoring * 10) / 10,
        scheduleLuck: Math.round(scheduleLuck * 10) / 10,
        seasonResult,
      },
      dominanceRate: Math.round(apw * 1000) / 1000,
      scoringIndex: Math.round(pfRatio * 100) / 100,
      rank: 0,
      finalRank: team.rank,
      interpretation,
    }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }))
}

export const calculateSDSPlus = calculatePPSI

export function getPPSIInfo() {
  return {
    name: 'PPSI',
    fullName: 'Party Ponies Season Index',
    description:
      'A three-pillar metric that combines All-Play Dominance, Era-Adjusted Scoring, Schedule Luck, and Season Result to compare seasons across different years.',
    thresholds: {
      allTime: 110,
      elite: 95,
      veryGood: 80,
      solid: 65,
    },
  }
}

export const getSDSPlusInfo = getPPSIInfo
