/**
 * Quick test script to calculate PONIES Score for a specific season
 * 
 * Run with: npm run test-ponies
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

// Import functions
import { fetchLeagueStandings } from "../lib/yahoo-api"
import { calculatePONIESScore, getMetricInfo } from "../lib/season-success-metric"

async function testPONIESScore() {
  console.log("Testing PONIES Score for 2023 season...\n")

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

    console.log(`Found ${standings.length} teams\n`)

    // Calculate PONIES Score
    const scores = calculatePONIESScore(standings)
    const metricInfo = getMetricInfo('ponies')

    console.log("=".repeat(100))
    console.log(`${metricInfo.name} - ${metricInfo.fullName}`)
    console.log("=".repeat(100))
    console.log(metricInfo.description)
    console.log(`Max possible score: ${metricInfo.maxScore}\n`)

    // Display results
    console.log("Rank | Owner              | Score  | Final | Championship | Playoff | Wins | Points | Win %")
    console.log("-".repeat(100))
    
    scores.forEach((score) => {
      const owner = (score.owner || "Unknown").padEnd(18)
      const scoreStr = score.score.toFixed(1).padStart(6)
      const finalRank = score.finalRank.toString().padStart(5)
      const champ = score.breakdown.championship.toString().padStart(12)
      const playoff = score.breakdown.playoffFinish.toString().padStart(7)
      const wins = score.breakdown.regularSeason.toString().padStart(5)
      const points = score.breakdown.pointsScored.toFixed(1).padStart(7)
      // Win percentage is stored as winPct * 40, so divide by 40 to get actual win %
      const winPct = ((score.breakdown.consistency / 40) * 100).toFixed(1).padStart(5)
      
      console.log(`${score.rank.toString().padStart(4)} | ${owner} | ${scoreStr} | ${finalRank} | ${champ} | ${playoff} | ${wins} | ${points} | ${winPct}%`)
    })

    console.log("\n" + "=".repeat(100))
    console.log("SCORING BREAKDOWN")
    console.log("=".repeat(100))
    console.log("Championship: 100 points (1st place)")
    console.log("Runner-up: 50 points (2nd place)")
    console.log("3rd place: 25 points")
    console.log("4th place: 15 points")
    console.log("5th-6th place: 10 points")
    console.log("Regular season wins: 2 points each")
    console.log("Points scored ranking: Up to 30 points (1st in points = 30, 2nd = 25, etc.)")
    console.log("Win percentage bonus: Up to 20 points (perfect season = 20, .500 = 10, etc.)")
    console.log()

    // Show some interesting comparisons
    console.log("=".repeat(100))
    console.log("KEY INSIGHTS")
    console.log("=".repeat(100))
    
    const champion = scores.find(s => s.finalRank === 1)
    const highestScore = scores[0]
    const mostPoints = [...standings].sort((a, b) => b.points_for - a.points_for)[0]
    
    if (champion && highestScore.team_key !== champion.team_key) {
      console.log(`🏆 Champion: ${champion.owner} (Final Rank: ${champion.finalRank}, PONIES Score: ${champion.score})`)
      console.log(`⭐ Highest PONIES Score: ${highestScore.owner} (Final Rank: ${highestScore.finalRank}, PONIES Score: ${highestScore.score})`)
      console.log(`📊 Most Points Scored: ${mostPoints.owner_name || mostPoints.name} (${mostPoints.points_for.toFixed(2)} points)`)
      console.log(`\n💡 The team with the highest PONIES Score didn't win the championship!`)
      console.log(`   This metric recognizes strong regular season performance even without a title.`)
    } else {
      console.log(`🏆 Champion: ${champion?.owner} (Final Rank: ${champion?.finalRank}, PONIES Score: ${champion?.score})`)
      console.log(`   The champion also had the highest PONIES Score - a dominant season!`)
    }
    
    console.log()

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error))
  }
}

// Run the test
testPONIESScore()
  .then(() => {
    console.log("\nDone!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Test failed:", error)
    process.exit(1)
  })
