/**
 * Test script for PPSI (Party Ponies Season Index)
 *
 * Run with: npm run test-sds-plus
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { fetchLeagueStandings, fetchAllWeeklyScores, fetchWeekMatchups } from "../lib/yahoo-api"
import { calculatePPSI, getPPSIInfo } from "../lib/sds-plus"

async function testPPSI() {
  console.log("Testing PPSI (Party Ponies Season Index) for 2023 season...\n")

  const allowedLeagueKeys = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS
  if (!allowedLeagueKeys) {
    console.log("ERROR: NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS not found")
    return
  }

  const leagueKeys = allowedLeagueKeys.split(',').map(k => k.trim())
  const league2023 = leagueKeys.find(k => k.startsWith('423.'))
  if (!league2023) {
    console.log("ERROR: Could not find 2023 league key")
    return
  }

  console.log(`Using league key: ${league2023}\n`)

  try {
    const standings = await fetchLeagueStandings(league2023)
    if (!standings || standings.length === 0) {
      console.log("No standings data found")
      return
    }

    console.log(`Found ${standings.length} teams`)
    console.log("Fetching weekly scores (this may take a moment)...\n")

    // Smoke check week 1
    try {
      const testWeek = await fetchWeekMatchups(league2023, 1)
      console.log(`✓ Found ${testWeek.length} week 1 matchups`)
      if (testWeek.length > 0 && testWeek[0].team1.points > 0) {
        console.log(`✓ Sample: ${testWeek[0].team1.name} — ${testWeek[0].team1.points} pts`)
      } else {
        console.log(`⚠ No scores extracted from week 1`)
      }
    } catch (err) {
      console.log(`✗ Week 1 error: ${err instanceof Error ? err.message : String(err)}`)
    }

    const weeklyScoresResult = await fetchAllWeeklyScores(league2023)
    const weeklyScores = weeklyScoresResult.map(ws => ({
      team_key: ws.team_key,
      week: ws.week,
      points: ws.points,
      opponent_key: ws.opponent_key,
    }))

    console.log(`\nFetched ${weeklyScores.length} weekly score entries`)
    const uniqueWeeks = new Set(weeklyScores.map(ws => ws.week))
    console.log(`Weeks found: ${Array.from(uniqueWeeks).sort((a, b) => a - b).join(', ')}`)

    const maxWeek = weeklyScores.length > 0 ? Math.max(...weeklyScores.map(ws => ws.week)) : 14
    const regularSeasonWeeks = Math.min(maxWeek, 14)
    console.log(`Regular season weeks: ${regularSeasonWeeks}\n`)

    // Calculate PPSI
    const scores = calculatePPSI(standings, weeklyScores, regularSeasonWeeks)
    const info = getPPSIInfo()

    console.log("=".repeat(100))
    console.log(`${info.name} — ${info.fullName}`)
    console.log("=".repeat(100))
    console.log(info.description)
    console.log()

    console.log("Rank | Owner              | PPSI   | Finish | DOM   | SCR   | LUCK  | RESULT")
    console.log("-".repeat(100))

    scores.forEach(score => {
      const owner = (score.owner || "Unknown").padEnd(18)
      const ppsi = score.score.toFixed(1).padStart(6)
      const finish = score.finalRank.toString().padStart(6)
      const dom = score.breakdown.dominance.toFixed(1).padStart(5)
      const scr = score.breakdown.scoring.toFixed(1).padStart(5)
      const luck = (score.breakdown.scheduleLuck >= 0 ? '+' : '') + score.breakdown.scheduleLuck.toFixed(1).padStart(5)
      const result = score.breakdown.seasonResult.toString().padStart(6)
      console.log(`${score.rank.toString().padStart(4)} | ${owner} | ${ppsi} | ${finish} | ${dom} | ${scr} | ${luck} | ${result}`)
    })

    console.log("\n" + "=".repeat(100))
    console.log("PPSI INTERPRETATION")
    console.log("=".repeat(100))
    console.log("110+ → All-time, generational season")
    console.log("95–109 → Elite: dominant team or dominant result")
    console.log("80–94 → Very good season")
    console.log("65–79 → Solid, above-average season")
    console.log("<65 → Below average season")
    console.log()

    const champion = scores.find(s => s.finalRank === 1)
    const topPPSI = scores[0]
    const mostPoints = [...standings].sort((a, b) => b.points_for - a.points_for)[0]

    console.log("=".repeat(100))
    console.log("KEY INSIGHTS")
    console.log("=".repeat(100))
    if (champion && topPPSI.team_key !== champion.team_key) {
      console.log(`🏆 Champion: ${champion.owner} (Finish: ${champion.finalRank}, PPSI: ${champion.score})`)
      console.log(`   ${champion.interpretation}`)
      console.log(`⭐ Highest PPSI: ${topPPSI.owner} (Finish: ${topPPSI.finalRank}, PPSI: ${topPPSI.score})`)
      console.log(`   ${topPPSI.interpretation}`)
      console.log(`📊 Top Scorer: ${mostPoints.owner_name || mostPoints.name} (${mostPoints.points_for.toFixed(2)} pts)`)
      console.log(`\n💡 The team with the highest PPSI didn't win — schedule variance intervened.`)
    } else {
      console.log(`🏆 Champion: ${champion?.owner} (Finish: ${champion?.finalRank}, PPSI: ${champion?.score})`)
      console.log(`   ${champion?.interpretation}`)
      console.log(`   The champion also had the highest PPSI — a truly dominant season!`)
    }

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error))
    console.error(error)
  }
}

testPPSI()
  .then(() => { console.log("\nDone!"); process.exit(0) })
  .catch(err => { console.error("Test failed:", err); process.exit(1) })
