/**
 * PPSI (Party Ponies Season Index) — v2
 *
 * Formula (v2): PPSI = Dominance + Scoring + Record + Result
 * Schedule Luck is computed and SHOWN but is NOT part of the total.
 *
 * PILLAR 1 — Dominance (0–50 pts)
 *   APW × 50, where APW = (all-play wins + 0.5 × ties) / all-play matchups.
 *   Only regular-season weeks. Zero-score team-weeks are excluded from the
 *   matrix (both as "team" and as "opponent") and logged.
 *
 * PILLAR 2 — Era-Adjusted Scoring (0–50 pts)
 *   (PF / league_avg_PF) × 25 + scoring_percentile × 25.
 *   PF = regular-season points only (weekly scores, not Yahoo standings total).
 *   percentile = (N – rank) / (N – 1). Tied PF receives average rank.
 *
 * PILLAR 3 — Record (0–10 pts)   [v2 only; 0 in v1]
 *   (W + 0.5 × T) / games × 10.  Based on Yahoo standings W-L-T.
 *
 * PILLAR 4 — Season Result (0–38 pts)
 *   Champion 35 | Runner-up 20 | 3rd 10 | 4th 5
 *   | Made playoffs, lost first played round (5th+) 2 | Missed 0
 *   Plus 3 bonus for #1 regular-season seed (best win%, PF tiebreak).
 *
 *   Playoff format by era (hardcoded — do not infer from Yahoo settings):
 *     2013–2017: 4-team playoff. Semis: 1v4 and 2v3. Ranks 5–6 are from the
 *       consolation bracket and receive 0 Result pts.
 *     2018–2025: 6-team playoff. Seeds 1–2 get first-round byes.
 *       Quarterfinals: 3v6 and 4v5. Ranks 5–6 get 2 pts.
 *
 * SCHEDULE LUCK (shown, not counted in v2)
 *   (APW − actual_win%) × 15. Positive = drew tough schedule.
 *
 * Fallback: if weekly scores are unavailable, APW = actual_win%, Luck = null,
 *   isFallback = true, and the UI shows a marker with a tooltip.
 *
 * v1 formula (for comparison):
 *   PPSI_v1 = Dominance + Scoring + ScheduleLuck + SeasonResult
 *   (Luck was included in the total; Record pillar did not exist.)
 */

import { YahooStanding } from './yahoo-api'

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface PPSIBreakdown {
  dominance: number      // APW × 50  (0–50)
  scoring: number        // era-adjusted  (0–50)
  record: number         // win% × 10  (0–10) — v2; always 0 in v1
  scheduleLuck: number   // (APW − win%) × 15 — shown, NOT in v2 total
  seasonResult: number   // playoff finish + seed bonus  (0–38)
}

export interface PPSIScore {
  owner: string
  team_key: string
  score: number
  breakdown: PPSIBreakdown
  dominanceRate: number    // Raw APW (0–1)
  scoringIndex: number     // Regular-season PF / league avg
  regularSeasonPF: number  // PF from regular-season weeks only
  rank: number             // PPSI rank (1 = best season this computation)
  finalRank: number        // Yahoo final overall rank
  interpretation: string
  isFallback: boolean      // true when all-play was estimated (no weekly data at all)
  isPartial: boolean       // true when some reg-season weeks are missing from all-play
  version: 'v1' | 'v2'

  // Metadata stored in cache
  regularSeasonWeeks?: number
  numPlayoffTeams?: number

  // Merged from live standings
  wins?: number
  losses?: number
  ties?: number
  points_for?: number
  points_against?: number
}

// Back-compat alias
export type SDSPlusScore = PPSIScore

// ─── Playoff sizes (hardcoded source of truth) ────────────────────────────────

/**
 * Hardcoded per-season playoff sizes.
 * 2013–2017: 4-team playoff (ranks 5–6 are consolation bracket, 0 Result pts).
 * 2018–2025: 6-team playoff (seeds 1–2 get first-round byes).
 */
export const PLAYOFF_SIZES_BY_SEASON: Record<string, number> = {
  '2013': 4, '2014': 4, '2015': 4, '2016': 4, '2017': 4,
  '2018': 6, '2019': 6, '2020': 6, '2021': 6, '2022': 6,
  '2023': 6, '2024': 6, '2025': 6,
}

/** Returns the canonical playoff team count for a given season year string. */
export function getPlayoffTeamCount(season: string): number {
  return PLAYOFF_SIZES_BY_SEASON[season] ?? 6
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

/**
 * PPSI v2 label thresholds — calibrated from actual data (130 team-seasons, 2013–2025).
 * Raw percentile cutoffs: 122.2 / 105.3 / 83.2 / 68.3 / 52.5 — rounded to nearest 5.
 * Counts with rounded thresholds (using 4-team playoff for 2013–2017):
 *   ≥ 120  All-time     7 seasons  ( 5%)
 *   ≥ 105  Elite       13 seasons  (10%)
 *   ≥  85  Very good   19 seasons  (15%)
 *   ≥  70  Above avg   27 seasons  (21%)
 *   ≥  55  Average     32 seasons  (25%)
 *    < 55  Below avg   32 seasons  (25%)
 *
 * Note: "Above avg" is 21% instead of 25% due to a natural cluster of seasons
 * just below 70 (several 2013–2017 seasons that lost 2 pts after the 4-team
 * playoff correction now sit at 68–69). Threshold kept at 70 (clean boundary).
 * Re-run `npm run recompute-ppsi` after any formula change.
 */
export const PPSI_V2_THRESHOLDS = {
  allTime:      120,
  elite:        105,
  veryGood:      85,
  aboveAverage:  70,
  average:       55,
} as const

/** v1 thresholds (kept for comparison rendering) */
export const PPSI_V1_THRESHOLDS = {
  allTime:  110,
  elite:     95,
  veryGood:  80,
  solid:     65,
} as const

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface WeeklyScore {
  team_key: string
  week: number
  points: number
  opponent_key?: string
}

/**
 * Build a set of "teamKey:week" pairs where the score is 0 or missing.
 * These team-weeks are excluded from all-play (both as team and as opponent).
 * Every exclusion is logged.
 */
function identifyZeroScoreWeeks(
  weeklyScores: WeeklyScore[],
  allTeamKeys: string[],
  regularSeasonWeeks: number
): Set<string> {
  const bad = new Set<string>()
  const logged: string[] = []

  // Explicitly recorded zeros
  weeklyScores.forEach(ws => {
    if (ws.week > regularSeasonWeeks) return
    if (ws.points <= 0) {
      const key = `${ws.team_key}:${ws.week}`
      if (!bad.has(key)) {
        bad.add(key)
        logged.push(`  Week ${ws.week}: team ${ws.team_key} scored 0 – excluded from all-play`)
      }
    }
  })

  // Weeks where a team appears in the data but has 0 are already caught above.
  // If a team is ENTIRELY MISSING from a week we have data for, also exclude.
  const weeksWithData = new Set(
    weeklyScores.filter(ws => ws.week <= regularSeasonWeeks).map(ws => ws.week)
  )
  weeksWithData.forEach(week => {
    const teamsThisWeek = new Set(
      weeklyScores.filter(ws => ws.week === week).map(ws => ws.team_key)
    )
    allTeamKeys.forEach(teamKey => {
      if (!teamsThisWeek.has(teamKey)) {
        const key = `${teamKey}:${week}`
        if (!bad.has(key)) {
          bad.add(key)
          logged.push(`  Week ${week}: team ${teamKey} missing from data – excluded from all-play`)
        }
      }
    })
  })

  if (logged.length > 0) {
    console.warn('[PPSI] Zero/missing score exclusions:\n' + logged.join('\n'))
  }

  return bad
}

/**
 * Compute all-play stats for one team.
 * APW = (wins + 0.5 × ties) / total_matchups.
 * Ties in all-play count as half a win.
 * Zero-score team-weeks are excluded as both "team" and "opponent."
 */
function computeAllPlay(
  teamKey: string,
  weeklyScores: WeeklyScore[],
  allTeamKeys: string[],
  regularSeasonWeeks: number,
  zeroScoreWeeks: Set<string>
): { apw: number; rawWins: number; rawTies: number; rawMatchups: number } {
  // Only regular-season weeks where this team has a valid score
  const teamWeeks = weeklyScores.filter(
    ws =>
      ws.team_key === teamKey &&
      ws.week <= regularSeasonWeeks &&
      !zeroScoreWeeks.has(`${ws.team_key}:${ws.week}`)
  )

  if (teamWeeks.length === 0) {
    return { apw: 0.5, rawWins: 0, rawTies: 0, rawMatchups: 0 }
  }

  // Build week→team→points map (all regular-season weeks)
  const scoresByWeek = new Map<number, Map<string, number>>()
  weeklyScores.forEach(ws => {
    if (ws.week > regularSeasonWeeks) return
    if (!scoresByWeek.has(ws.week)) scoresByWeek.set(ws.week, new Map())
    scoresByWeek.get(ws.week)!.set(ws.team_key, ws.points)
  })

  let rawWins = 0
  let rawTies = 0
  let rawMatchups = 0

  teamWeeks.forEach(tw => {
    const weekMap = scoresByWeek.get(tw.week)
    if (!weekMap) return

    allTeamKeys.forEach(oppKey => {
      if (oppKey === teamKey) return
      // Skip opponent if they had a zero/missing score this week
      if (zeroScoreWeeks.has(`${oppKey}:${tw.week}`)) return

      const oppPts = weekMap.get(oppKey)
      if (oppPts === undefined) return // opponent not in league

      if (tw.points > oppPts) rawWins++
      else if (tw.points === oppPts) rawTies++
      rawMatchups++
    })
  })

  const apw =
    rawMatchups > 0
      ? (rawWins + 0.5 * rawTies) / rawMatchups
      : 0.5

  return { apw, rawWins, rawTies, rawMatchups }
}

/**
 * Compute regular-season PF from weekly scores.
 * Excludes zero-score weeks (bad data).
 * Falls back to Yahoo standings PF if weekly data is unavailable.
 */
function computeRegularSeasonPF(
  teamKey: string,
  weeklyScores: WeeklyScore[],
  regularSeasonWeeks: number,
  standingsPF: number
): number {
  if (weeklyScores.length === 0) return standingsPF

  const total = weeklyScores
    .filter(ws => ws.team_key === teamKey && ws.week <= regularSeasonWeeks && ws.points > 0)
    .reduce((sum, ws) => sum + ws.points, 0)

  // If we got no valid weekly scores for this team, fall back to standings PF
  return total > 0 ? total : standingsPF
}

/**
 * Season Result bonus for a team.
 * @param rank     Final Yahoo rank (1 = champion)
 * @param numPT    Number of playoff teams this season
 */
function getSeasonResult(rank: number, numPT: number): number {
  if (rank === 1) return 35
  if (rank === 2) return 20
  if (rank === 3) return 10
  if (rank === 4) return 5
  // Made playoffs but lost in first round they played (not bye), finished 5th+
  // Only applies when playoff bracket is > 4 teams
  if (numPT > 4 && rank >= 5 && rank <= numPT) return 2
  // Missed playoffs (rank > numPT) = 0
  return 0
}

/**
 * Return an interpretation string for a v2 PPSI score.
 */
function interpretV2(score: number): string {
  if (score >= PPSI_V2_THRESHOLDS.allTime) return 'All-time, generational season'
  if (score >= PPSI_V2_THRESHOLDS.elite) return 'Elite — dominant team or dominant result'
  if (score >= PPSI_V2_THRESHOLDS.veryGood) return 'Very good season'
  if (score >= PPSI_V2_THRESHOLDS.aboveAverage) return 'Above average season'
  if (score >= PPSI_V2_THRESHOLDS.average) return 'Average season'
  return 'Below average season'
}

function interpretV1(score: number): string {
  if (score >= PPSI_V1_THRESHOLDS.allTime) return 'All-time, generational season'
  if (score >= PPSI_V1_THRESHOLDS.elite) return 'Elite — dominant team or dominant result'
  if (score >= PPSI_V1_THRESHOLDS.veryGood) return 'Very good season'
  if (score >= PPSI_V1_THRESHOLDS.solid) return 'Solid, above-average season'
  return 'Below average season'
}

// ─── Main calculation ─────────────────────────────────────────────────────────

/**
 * Calculate PPSI (v1 or v2) for every team in a season.
 *
 * @param standings          Yahoo standings for the season
 * @param weeklyScores       All weekly matchup scores (may include zeros — we handle them)
 * @param regularSeasonWeeks Last regular-season week number (from league settings:
 *                            playoff_start_week − 1). Default 14.
 * @param numPlayoffTeams    How many teams made the playoffs this season. Default 6.
 * @param version            'v2' (default) or 'v1' (original formula, for comparison).
 */
export function calculatePPSI(
  standings: YahooStanding[],
  weeklyScores: WeeklyScore[] = [],
  regularSeasonWeeks: number = 14,
  numPlayoffTeams: number = 6,
  version: 'v1' | 'v2' = 'v2'
): PPSIScore[] {
  const N = standings.length
  const allTeamKeys = standings.map(t => t.team_key)

  // ── Zero-score identification ────────────────────────────────────────────
  const zeroScoreWeeks =
    weeklyScores.length > 0
      ? identifyZeroScoreWeeks(weeklyScores, allTeamKeys, regularSeasonWeeks)
      : new Set<string>()

  // ── All-play win percentages ─────────────────────────────────────────────
  const isFallback = weeklyScores.length === 0
  const allPlayMap = new Map<
    string,
    { apw: number; rawWins: number; rawTies: number; rawMatchups: number }
  >()

  if (!isFallback) {
    allTeamKeys.forEach(teamKey => {
      allPlayMap.set(teamKey, computeAllPlay(teamKey, weeklyScores, allTeamKeys, regularSeasonWeeks, zeroScoreWeeks))
    })
  } else {
    // Fallback: use actual win% as APW proxy
    allTeamKeys.forEach(teamKey => {
      const team = standings.find(t => t.team_key === teamKey)
      if (team) {
        const games = team.wins + team.losses + team.ties
        const winPct = games > 0 ? (team.wins + 0.5 * team.ties) / games : 0.5
        allPlayMap.set(teamKey, { apw: winPct, rawWins: team.wins, rawTies: team.ties, rawMatchups: games })
      }
    })
  }

  // ── Regular-season PF ────────────────────────────────────────────────────
  const regularSeasonPFMap = new Map<string, number>()
  standings.forEach(team => {
    regularSeasonPFMap.set(
      team.team_key,
      computeRegularSeasonPF(team.team_key, weeklyScores, regularSeasonWeeks, team.points_for)
    )
  })

  // ── Era-adjusted scoring ─────────────────────────────────────────────────
  const avgPF =
    standings.reduce((sum, t) => sum + (regularSeasonPFMap.get(t.team_key) ?? t.points_for), 0) / N

  // Rank teams by regular-season PF, giving tied teams the average rank
  const pfValues = standings.map(t => regularSeasonPFMap.get(t.team_key) ?? t.points_for)
  const sortedPFDesc = [...pfValues].sort((a, b) => b - a)

  function pfRankForTeam(teamKey: string): number {
    const pf = regularSeasonPFMap.get(teamKey) ?? (standings.find(t => t.team_key === teamKey)?.points_for ?? 0)
    // Find all positions with same PF, use average (1-based)
    const positions = sortedPFDesc.reduce<number[]>((acc, v, i) => {
      if (v === pf) acc.push(i + 1)
      return acc
    }, [])
    return positions.reduce((a, b) => a + b, 0) / positions.length
  }

  // ── #1 regular-season seed (best actual win%, tiebreak PF) ───────────────
  const seedRankings = standings
    .map(t => {
      const games = t.wins + t.losses + t.ties
      const winPct = games > 0 ? (t.wins + 0.5 * t.ties) / games : 0
      return { team_key: t.team_key, winPct, pf: regularSeasonPFMap.get(t.team_key) ?? t.points_for }
    })
    .sort((a, b) => b.winPct - a.winPct || b.pf - a.pf)

  const topSeedKey = seedRankings[0]?.team_key

  // ── Compute each team's score ────────────────────────────────────────────
  const scored = standings.map(team => {
    const games = team.wins + team.losses + team.ties
    const actualWinPct = games > 0 ? (team.wins + 0.5 * team.ties) / games : 0.5

    const { apw, rawWins, rawTies, rawMatchups } = allPlayMap.get(team.team_key) ?? {
      apw: 0.5, rawWins: 0, rawTies: 0, rawMatchups: 0,
    }

    const rsPF = regularSeasonPFMap.get(team.team_key) ?? team.points_for
    const pfRatio = avgPF > 0 ? rsPF / avgPF : 1.0
    const scoringPctileRank = pfRankForTeam(team.team_key)
    const scoringPctile = N > 1 ? 1 - (scoringPctileRank - 1) / (N - 1) : 1.0

    // Pillar 1: Dominance
    const dominance = apw * 50

    // Pillar 2: Era-Adjusted Scoring
    const scoring = pfRatio * 25 + scoringPctile * 25

    // Pillar 3: Record (v2 only)
    const record = version === 'v2'
      ? actualWinPct * 10
      : 0

    // Schedule Luck (shown but NOT in v2 total)
    const scheduleLuck = (apw - actualWinPct) * 15

    // Pillar 4: Season Result
    const baseResult = getSeasonResult(team.rank, numPlayoffTeams)
    const seedBonus = team.team_key === topSeedKey ? 3 : 0
    const seasonResult = baseResult + seedBonus

    // Final score
    let rawScore: number
    if (version === 'v2') {
      rawScore = dominance + scoring + record + seasonResult  // Luck excluded
    } else {
      // v1: includes luck, no record pillar
      rawScore = dominance + scoring + scheduleLuck + seasonResult
    }

    const score = Math.round(rawScore * 10) / 10

    const interpretation = version === 'v2' ? interpretV2(score) : interpretV1(score)

    return {
      owner: team.owner_name || team.name,
      team_key: team.team_key,
      score,
      breakdown: {
        dominance: Math.round(dominance * 10) / 10,
        scoring: Math.round(scoring * 10) / 10,
        record: Math.round(record * 10) / 10,
        scheduleLuck: Math.round(scheduleLuck * 10) / 10,
        seasonResult,
      },
      dominanceRate: Math.round(apw * 1000) / 1000,
      scoringIndex: Math.round(pfRatio * 100) / 100,
      regularSeasonPF: Math.round(rsPF * 100) / 100,
      rank: 0,
      finalRank: team.rank,
      interpretation,
      isFallback,
      isPartial: false,    // set by caller when partial weekly data is used
      version,
      regularSeasonWeeks,
      numPlayoffTeams,
    } as PPSIScore
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }))
}

// Back-compat alias
export const calculateSDSPlus = calculatePPSI

// ─── Info / metadata ──────────────────────────────────────────────────────────

export function getPPSIInfo(version: 'v1' | 'v2' = 'v2') {
  if (version === 'v2') {
    return {
      name: 'PPSI v2',
      fullName: 'Party Ponies Season Index v2',
      description:
        'Four-pillar metric: All-Play Dominance, Era-Adjusted Scoring, Regular-Season Record, and Season Result. Schedule Luck is shown for reference but is not included in the score.',
      thresholds: PPSI_V2_THRESHOLDS,
    }
  }
  return {
    name: 'PPSI v1',
    fullName: 'Party Ponies Season Index v1',
    description:
      'Original formula: All-Play Dominance + Era-Adjusted Scoring + Schedule Luck + Season Result.',
    thresholds: PPSI_V1_THRESHOLDS,
  }
}

export const getSDSPlusInfo = getPPSIInfo
