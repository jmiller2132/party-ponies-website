/**
 * Test script for SDS+ (Season Dominance Score Plus)
 * 
 * Run with: npm run test-sds-plus
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

// Import functions
import { fetchLeagueStandings, fetchAllWeeklyScores, fetchWeekMatchups } from "../lib/yahoo-api"
import { calculateSDSPlus, getSDSPlusInfo } from "../lib/sds-plus"
import { getValidYahooToken } from "../lib/yahoo-auth"

async function testSDSPlus() {
  console.log("Testing SDS+ (Season Dominance Score Plus) for 2023 season...\n")

  // Get league keys from environment
  const allowedLeagueKeys = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS
  
  if (!allowedLeagueKeys) {
    console.log("ERROR: NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS not found")
    return
  }

  // Find 2023 league key (should be 423.l.44808)
  const leagueKeys = allowedLeagueKeys.split(',').map(k => k.trim())
  const league2023 = leagueKeys.find(k => k.startsWith('423.'))
  
  if (!league2023) {
    console.log("ERROR: Could not find 2023 league key")
    return
  }

  console.log(`Using league key: ${league2023}\n`)

  try {
    // Fetch standings
    const standings = await fetchLeagueStandings(league2023)
    
    if (!standings || standings.length === 0) {
      console.log("No standings data found")
      return
    }

    console.log(`Found ${standings.length} teams`)
    console.log("Fetching weekly scores (this may take a moment)...\n")

    // Fetch all weekly scores
    console.log("Fetching weekly scores for weeks 1-14...")
    
    // Quick test of week 1
    console.log("Testing week 1 extraction...")
    try {
      const testWeek = await fetchWeekMatchups(league2023, 1)
      console.log(`✓ Found ${testWeek.length} matchups`)
      if (testWeek.length > 0 && testWeek[0].team1.points > 0) {
        console.log(`✓ Successfully extracted scores! Sample: ${testWeek[0].team1.name} - ${testWeek[0].team1.points} pts`)
      } else {
        console.log(`⚠ No scores extracted from week 1`)
      }
    } catch (error) {
      console.log(`✗ Week 1 error: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    const weeklyScoresResult = await fetchAllWeeklyScores(league2023)
    const weeklyScores = weeklyScoresResult.map(ws => ({
      team_key: ws.team_key,
      week: ws.week,
      points: ws.points,
      opponent_key: ws.opponent_key, // Preserve opponent tracking
    }))
    
    // Check opponent tracking
    const scoresWithOpponents = weeklyScores.filter(ws => ws.opponent_key).length
    console.log(`\nOpponent tracking: ${scoresWithOpponents} / ${weeklyScores.length} scores have opponent data`)
    if (scoresWithOpponents > 0) {
      const sampleWithOpponent = weeklyScores.find(ws => ws.opponent_key)
      console.log(`Sample: Team ${sampleWithOpponent?.team_key} faced ${sampleWithOpponent?.opponent_key} in week ${sampleWithOpponent?.week}`)
    } else {
      console.log(`⚠️  No opponent tracking found - SoS will use league average`)
    }

    console.log(`Found ${weeklyScores.length} weekly score entries`)
    if (weeklyScores.length > 0) {
      const uniqueWeeks = new Set(weeklyScores.map(ws => ws.week))
      console.log(`Weeks found: ${Array.from(uniqueWeeks).sort((a, b) => a - b).join(', ')}`)
      console.log(`Sample entries: ${JSON.stringify(weeklyScores.slice(0, 3), null, 2)}`)
    } else {
      console.log("⚠️  No weekly scores found - will use estimates")
    }
    
    // Determine regular season weeks (typically 14, but use max week found)
    const maxWeek = weeklyScores.length > 0 
      ? Math.max(...weeklyScores.map(ws => ws.week))
      : 14
    const regularSeasonWeeks = Math.min(maxWeek, 14) // Assume 14 week regular season
    
    console.log(`Regular season weeks: ${regularSeasonWeeks}\n`)

    // Calculate SDS+
    const scores = calculateSDSPlus(standings, weeklyScores, regularSeasonWeeks)
    const metricInfo = getSDSPlusInfo()

    console.log("=".repeat(120))
    console.log(`${metricInfo.name} - ${metricInfo.fullName}`)
    console.log("=".repeat(120))
    console.log(metricInfo.description)
    console.log(`Max possible score: ${metricInfo.maxScore}\n`)

    // Display results
    console.log("Rank | Owner              | SDS+   | Final | PFI_era | APW    | RSS  | WCR   | SoS  | CI   | PSB_adj | LD")
    console.log("-".repeat(120))
    
    scores.forEach((score) => {
      const owner = (score.owner || "Unknown").padEnd(18)
      const sdsPlus = score.score.toFixed(1).padStart(6)
      const finalRank = score.finalRank.toString().padStart(5)
      const pfIndexEra = score.breakdown.pfIndexEra.toFixed(2).padStart(7)
      const apw = (score.breakdown.allPlayWinPct * 100).toFixed(1).padStart(6) + '%'
      const rss = score.breakdown.regularSeasonScore.toFixed(2).padStart(5)
      const wcr = score.breakdown.weeklyCeilingRate.toFixed(2).padStart(6)
      const sos = score.breakdown.strengthOfSchedule.toFixed(2).padStart(5)
      const ci = score.breakdown.consistencyIndex.toFixed(2).padStart(5)
      const psbAdj = score.breakdown.postseasonBonus.toFixed(2).padStart(8)
      const ld = score.breakdown.playoffLuckDiff.toFixed(2).padStart(4)
      
      console.log(`${score.rank.toString().padStart(4)} | ${owner} | ${sdsPlus} | ${finalRank} | ${pfIndexEra} | ${apw} | ${rss} | ${wcr} | ${sos} | ${ci} | ${psbAdj} | ${ld}`)
    })

    console.log("\n" + "=".repeat(120))
    console.log("INTERPRETATION GUIDE")
    console.log("=".repeat(120))
    console.log("95+ → All-time, era-defining season")
    console.log("85–94 → Dominant, likely robbed by variance")
    console.log("75–84 → Elite champion or contender")
    console.log("65–74 → Solid title or strong season")
    console.log("<65 → Average or luck-driven outcome")
    console.log()

    // Show key insights
    console.log("=".repeat(120))
    console.log("KEY INSIGHTS")
    console.log("=".repeat(120))
    
    const champion = scores.find(s => s.finalRank === 1)
    const highestScore = scores[0]
    const mostPoints = [...standings].sort((a, b) => b.points_for - a.points_for)[0]
    
    if (champion && highestScore.team_key !== champion.team_key) {
      console.log(`🏆 Champion: ${champion.owner} (Final Rank: ${champion.finalRank}, SDS+: ${champion.score})`)
      console.log(`   Interpretation: ${champion.interpretation}`)
      console.log(`⭐ Highest SDS+: ${highestScore.owner} (Final Rank: ${highestScore.finalRank}, SDS+: ${highestScore.score})`)
      console.log(`   Interpretation: ${highestScore.interpretation}`)
      console.log(`📊 Most Points Scored: ${mostPoints.owner_name || mostPoints.name} (${mostPoints.points_for.toFixed(2)} points)`)
      console.log(`\n💡 The team with the highest SDS+ didn't win the championship!`)
      console.log(`   This metric recognizes true dominance even when playoff variance intervenes.`)
    } else {
      console.log(`🏆 Champion: ${champion?.owner} (Final Rank: ${champion?.finalRank}, SDS+: ${champion?.score})`)
      console.log(`   Interpretation: ${champion?.interpretation}`)
      console.log(`   The champion also had the highest SDS+ - a truly dominant season!`)
    }
    
    console.log()

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error))
    console.error(error)
  }
}

// Run the test
testSDSPlus()
  .then(() => {
    console.log("\nDone!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Test failed:", error)
    process.exit(1)
  })
