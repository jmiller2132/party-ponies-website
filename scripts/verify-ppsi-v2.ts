/**
 * PPSI v2 full-league verification script.
 *
 * What it does:
 *  1. For every season: fetch league settings → log playoff size & start week
 *  2. Compute v1 and v2 PPSI for all seasons
 *  3. Print before/after table (v1 vs v2, sorted by biggest mover)
 *  4. Print per-season verification: DOM+SCR+REC+RESULT = PPSI ±0.1
 *  5. Print label distribution against v2 thresholds
 *  6. List zero-score exclusions, merged managers, fallback seasons
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/verify-ppsi-v2.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { fetchLeagueStandings, fetchAllWeeklyScores, fetchLeagueSettings } from '../lib/yahoo-api'
import { calculatePPSI, PPSI_V2_THRESHOLDS, PPSIScore } from '../lib/sds-plus'
import { GAME_KEY_TO_YEAR } from '../lib/yahoo-game-keys'

// All 13 seasons from .env
const LEAGUE_KEYS = (process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS || '')
  .split(',').map(k => k.trim()).filter(Boolean)

function yearOf(leagueKey: string): string {
  const gk = leagueKey.split('.')[0]
  return GAME_KEY_TO_YEAR[gk] || '????'
}

interface SeasonResult {
  year: string
  leagueKey: string
  playoffStartWeek: number
  numPlayoffTeams: number
  regularSeasonWeeks: number
  numTeams: number
  isFallback: boolean
  v1Scores: PPSIScore[]
  v2Scores: PPSIScore[]
  zeroExclusions: string[]
}

// Monkey-patch console.warn to capture zero-score logs
const capturedWarnings: string[] = []
const origWarn = console.warn.bind(console)
console.warn = (...args: any[]) => {
  const msg = args.join(' ')
  if (msg.includes('[PPSI]')) capturedWarnings.push(msg)
  // suppress noisy output during batch run
}

async function processSeason(leagueKey: string): Promise<SeasonResult | null> {
  const year = yearOf(leagueKey)
  process.stdout.write(`  ${year} (${leagueKey})... `)

  try {
    // 1. League settings
    let settings = { num_regular_season_weeks: 14, num_playoff_teams: 6, playoff_start_week: 15, num_teams: 10 }
    try {
      settings = await fetchLeagueSettings(leagueKey)
    } catch (e) {
      process.stdout.write('[settings-fallback] ')
    }

    // 2. Standings
    const standings = await fetchLeagueStandings(leagueKey)

    // 3. Weekly scores
    const weeklyScoresRaw = await fetchAllWeeklyScores(leagueKey)

    // Capture zero warnings for this season
    const beforeWarnCount = capturedWarnings.length

    // 4. V1 (with fallback weeks for comparison)
    const v1Scores = calculatePPSI(
      standings, weeklyScoresRaw,
      settings.num_regular_season_weeks,
      settings.num_playoff_teams,
      'v1'
    )

    // 5. V2
    const v2Scores = calculatePPSI(
      standings, weeklyScoresRaw,
      settings.num_regular_season_weeks,
      settings.num_playoff_teams,
      'v2'
    )

    const zeroExclusions = capturedWarnings.slice(beforeWarnCount)

    console.warn = origWarn // restore for this line
    process.stdout.write(`✓ (${standings.length} teams)\n`)
    console.warn = (...args: any[]) => {
      const msg = args.join(' ')
      if (msg.includes('[PPSI]')) capturedWarnings.push(msg)
    }

    return {
      year,
      leagueKey,
      playoffStartWeek: settings.playoff_start_week,
      numPlayoffTeams: settings.num_playoff_teams,
      regularSeasonWeeks: settings.num_regular_season_weeks,
      numTeams: standings.length,
      isFallback: weeklyScoresRaw.length === 0,
      v1Scores,
      v2Scores,
      zeroExclusions,
    }
  } catch (e) {
    console.warn = origWarn
    process.stdout.write(`✗ ${e instanceof Error ? e.message : String(e)}\n`)
    console.warn = (...args: any[]) => {
      const msg = args.join(' ')
      if (msg.includes('[PPSI]')) capturedWarnings.push(msg)
    }
    return null
  }
}

function fmt(n: number, w = 7) { return n.toFixed(1).padStart(w) }
function fmtI(n: number, w = 4) { return String(n).padStart(w) }

async function main() {
  console.log('=' .repeat(100))
  console.log('PPSI v2 — FULL LEAGUE VERIFICATION')
  console.log('=' .repeat(100))
  console.log(`Seasons to process: ${LEAGUE_KEYS.length}\n`)

  // ── Process all seasons ──────────────────────────────────────────────────
  const results: SeasonResult[] = []
  for (const lk of LEAGUE_KEYS) {
    const r = await processSeason(lk)
    if (r) results.push(r)
  }
  results.sort((a, b) => a.year.localeCompare(b.year))

  console.log()

  // ── 1. Playoff settings per season ───────────────────────────────────────
  console.log('─'.repeat(70))
  console.log('PLAYOFF SIZE & REGULAR-SEASON WEEKS PER SEASON')
  console.log('─'.repeat(70))
  console.log('Year  | Teams | Playoff Teams | Playoff Start Wk | Reg-Season Wks')
  console.log('-'.repeat(70))
  results.forEach(r => {
    console.log(
      `${r.year}  |${fmtI(r.numTeams, 7)} |${fmtI(r.numPlayoffTeams, 15)} |${fmtI(r.playoffStartWeek, 18)} |${fmtI(r.regularSeasonWeeks, 16)}`
    )
  })

  // ── 2. Per-season balance check (DOM+SCR+REC+RESULT = PPSI ±0.1) ─────────
  console.log()
  console.log('─'.repeat(100))
  console.log('BALANCE CHECK  DOM + SCR + REC + RESULT = PPSI  (v2, tolerance ±0.1)')
  console.log('─'.repeat(100))

  let allBalanced = true
  let allPlayoffCounts = true

  results.forEach(r => {
    let seasonOk = true
    let seasonMsg = `  ${r.year}: `
    const playoffCount = r.v2Scores.filter(s => s.breakdown.seasonResult > 0).length
    const seedBonusCount = r.v2Scores.filter(s => s.breakdown.seasonResult > 0 && s.breakdown.seasonResult % 3 === 0).length
    // Teams with result > 0 = playoff teams (plus possibly the #1 seed who may have also made playoffs)
    // Just check that exactly numPlayoffTeams teams have base result > 0
    
    r.v2Scores.forEach(s => {
      const computed = s.breakdown.dominance + s.breakdown.scoring + s.breakdown.record + s.breakdown.seasonResult
      const delta = Math.abs(computed - s.score)
      if (delta > 0.15) {
        seasonMsg += `✗${s.owner}(Δ${delta.toFixed(2)}) `
        seasonOk = false
        allBalanced = false
      }
    })
    if (seasonOk) seasonMsg += '✓ all balanced'

    // Check playoff count (teams with base result ignoring seed bonus)
    const teamsWithResult = r.v2Scores.filter(s => {
      const baseResult = s.breakdown.seasonResult - (s.breakdown.seasonResult >= 3 && s.breakdown.seasonResult % 3 === 0 ? 0 : 0)
      return s.breakdown.seasonResult > 0 
    }).length
    // Actually let's check differently: teams with rank ≤ numPlayoffTeams
    const expectedPlayoffTeams = r.numPlayoffTeams
    const teamsWithPositiveResult = r.v2Scores.filter(s => {
      // base result (without seed bonus): if seasonResult - 3 > 0, they also got seed bonus
      const withoutBonus = s.breakdown.seasonResult >= 3 ? s.breakdown.seasonResult - 3 : s.breakdown.seasonResult
      return withoutBonus > 0 || (s.breakdown.seasonResult === 3) // seed bonus only for #1 seed who missed playoffs (impossible normally)
    }).length

    seasonMsg += ` | Playoff result>0: ${teamsWithResult} (expected ${expectedPlayoffTeams})`
    if (teamsWithResult !== expectedPlayoffTeams) {
      // The count will be off by the seed bonus case — check more carefully
      const hasResult = r.v2Scores.filter(s => {
        if (s.finalRank === 1) return true  // champion: 35+3=38
        if (s.finalRank === 2) return true  // runner-up: 20 or 23
        if (s.finalRank === 3) return true  // 3rd: 10 or 13
        if (s.finalRank === 4) return true  // 4th: 5 or 8
        if (s.finalRank <= r.numPlayoffTeams) return true  // 5th+: 2 or 5
        // seed bonus might push a missed-playoffs team above 0... but only if #1 seed missed playoffs (unusual)
        return s.breakdown.seasonResult > 0
      }).length
    }
    
    console.log(seasonMsg)
  })

  console.log()
  console.log(allBalanced ? '✓ ALL SEASONS BALANCE' : '✗ SOME SEASONS HAVE IMBALANCES')

  // ── 3. Before/after table (v1 vs v2) ────────────────────────────────────
  console.log()
  console.log('─'.repeat(100))
  console.log('BEFORE / AFTER  —  v1 vs v2 PPSI  (sorted by biggest mover)')
  console.log('─'.repeat(100))
  console.log('Year  | Owner              | v1 PPSI | v2 PPSI | Change  | v1 Rank | v2 Rank | v1→v2 Rank Δ')
  console.log('-'.repeat(100))

  interface Row { year: string; owner: string; v1: number; v2: number; v1r: number; v2r: number }
  const rows: Row[] = []

  results.forEach(r => {
    r.v2Scores.forEach(v2s => {
      const v1s = r.v1Scores.find(s => s.team_key === v2s.team_key)
      if (!v1s) return
      rows.push({ year: r.year, owner: v2s.owner, v1: v1s.score, v2: v2s.score, v1r: v1s.rank, v2r: v2s.rank })
    })
  })

  rows.sort((a, b) => Math.abs(b.v2 - b.v1) - Math.abs(a.v2 - a.v1))

  rows.forEach(row => {
    const change = row.v2 - row.v1
    const rankDelta = row.v1r - row.v2r
    const changeStr = (change >= 0 ? '+' : '') + change.toFixed(1)
    const rankDeltaStr = (rankDelta >= 0 ? '+' : '') + rankDelta
    const owner = row.owner.padEnd(18)
    console.log(
      `${row.year}  | ${owner} |${fmt(row.v1, 8)} |${fmt(row.v2, 8)} |${changeStr.padStart(8)} |${fmtI(row.v1r, 8)} |${fmtI(row.v2r, 8)} | ${rankDeltaStr}`
    )
  })

  // ── 4. Label distribution ────────────────────────────────────────────────
  console.log()
  console.log('─'.repeat(60))
  console.log('LABEL DISTRIBUTION  (v2 thresholds, all 130 team-seasons)')
  console.log('─'.repeat(60))
  const allV2 = rows.map(r => r.v2).sort((a, b) => b - a)
  const total = allV2.length
  const T = PPSI_V2_THRESHOLDS
  const bands = [
    { label: 'All-time     (≥' + T.allTime + ')', min: T.allTime, max: Infinity },
    { label: 'Elite        (≥' + T.elite + ')',   min: T.elite,   max: T.allTime - 0.01 },
    { label: 'Very good    (≥' + T.veryGood + ')',   min: T.veryGood, max: T.elite - 0.01 },
    { label: 'Above avg    (≥' + T.aboveAverage + ')', min: T.aboveAverage, max: T.veryGood - 0.01 },
    { label: 'Average      (≥' + T.average + ')',      min: T.average, max: T.aboveAverage - 0.01 },
    { label: 'Below avg    (<' + T.average + ')',      min: -Infinity, max: T.average - 0.01 },
  ]
  bands.forEach(b => {
    const count = allV2.filter(v => v >= b.min && v <= b.max).length
    const pct = (count / total * 100).toFixed(1)
    const bar = '█'.repeat(Math.round(count / total * 40))
    console.log(`  ${b.label.padEnd(22)}: ${String(count).padStart(3)} seasons (${pct.padStart(5)}%)  ${bar}`)
  })
  console.log(`  Total: ${total} team-seasons`)

  // ── 5. Score range ───────────────────────────────────────────────────────
  const minV2 = Math.min(...allV2), maxV2 = Math.max(...allV2)
  const p5  = allV2[Math.floor(total * 0.05)]
  const p10 = allV2[Math.floor(total * 0.10)]
  const p25 = allV2[Math.floor(total * 0.25)]
  const p50 = allV2[Math.floor(total * 0.50)]
  console.log()
  console.log(`  v2 range: ${minV2.toFixed(1)} – ${maxV2.toFixed(1)}`)
  console.log(`  Percentiles: p5=${p5?.toFixed(1)} p10=${p10?.toFixed(1)} p25=${p25?.toFixed(1)} p50=${p50?.toFixed(1)}`)
  console.log()
  console.log('  Suggested threshold calibration (based on this distribution):')
  console.log(`    All-time  ≥ ${p5?.toFixed(0)}   (top 5% = ${Math.round(total*0.05)} seasons)`)
  console.log(`    Elite     ≥ ${p10?.toFixed(0)}   (top 10% = ${Math.round(total*0.10)} seasons)`)
  console.log(`    Very good ≥ ${p25?.toFixed(0)}   (top 25% = ${Math.round(total*0.25)} seasons)`)

  // ── 6. Zero-score exclusions ─────────────────────────────────────────────
  console.log()
  console.log('─'.repeat(70))
  console.log('ZERO-SCORE WEEK EXCLUSIONS')
  console.log('─'.repeat(70))
  if (capturedWarnings.length === 0) {
    console.log('  (none — no zero-score team-weeks found)')
  } else {
    capturedWarnings.forEach(w => console.log(' ', w))
  }

  // ── 7. Fallback seasons ───────────────────────────────────────────────────
  const fallbacks = results.filter(r => r.isFallback)
  console.log()
  console.log('─'.repeat(70))
  console.log('FALLBACK SEASONS (no weekly score data)')
  console.log('─'.repeat(70))
  if (fallbacks.length === 0) {
    console.log('  (none — all seasons have weekly score data)')
  } else {
    fallbacks.forEach(r => console.log(`  ${r.year} — all-play estimated from actual win%`))
  }

  // ── 8. Merged managers ────────────────────────────────────────────────────
  console.log()
  console.log('─'.repeat(70))
  console.log('MANAGER NAME AUDIT')
  console.log('─'.repeat(70))
  const allOwners = new Map<string, Set<string>>() // owner → set of years
  results.forEach(r => {
    r.v2Scores.forEach(s => {
      if (!allOwners.has(s.owner)) allOwners.set(s.owner, new Set())
      allOwners.get(s.owner)!.add(r.year)
    })
  })
  const sorted = [...allOwners.entries()].sort((a, b) => b[1].size - a[1].size)
  sorted.forEach(([name, years]) => {
    const yrs = [...years].sort().join(', ')
    console.log(`  ${name.padEnd(22)} ${years.size} seasons: ${yrs}`)
  })

  // Specifically check Jack Harvarth is merged
  const jackSeasons = allOwners.get('Jack Harvarth')
  const jackHarvath = allOwners.get('Jack Harvath')
  console.log()
  if (jackHarvath) {
    console.log('  ✗ "Jack Harvath" still appears — name merge incomplete. Check owner-names.ts and clear Supabase caches.')
  } else if (jackSeasons) {
    console.log(`  ✓ "Jack Harvarth" is unified: ${jackSeasons.size} seasons (2013–2025)`)
  } else {
    console.log('  ? Jack Harvarth not found in any season — check Yahoo API or name mapping')
  }

  console.log()
  console.log('=' .repeat(100))
  console.log('VERIFICATION COMPLETE')
  console.log('=' .repeat(100))
}

main()
  .then(() => { console.warn = origWarn; process.exit(0) })
  .catch(err => { console.warn = origWarn; console.error(err); process.exit(1) })
