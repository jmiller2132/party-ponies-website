/**
 * Script to fetch all owner names from filtered leagues
 * 
 * Run with: npm run get-owners
 * 
 * Make sure NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS is set in your .env.local file
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

// Import Yahoo API functions directly
import { fetchLeagueStandings } from "../lib/yahoo-api"

// Map game keys to years
const GAME_KEY_TO_YEAR: Record<string, string> = {
  "314": "2013",
  "331": "2014",
  "348": "2015",
  "359": "2016",
  "371": "2017",
  "380": "2018",
  "390": "2019",
  "399": "2020",
  "406": "2021",
  "414": "2022",
  "423": "2023",
  "449": "2024",
  "461": "2025",
}

function getYearFromLeagueKey(leagueKey: string): string {
  const gameKey = leagueKey.split('.')[0]
  return GAME_KEY_TO_YEAR[gameKey] || gameKey
}

interface OwnerInfo {
  yahooOwnerName: string
  teamName: string
  year: string
  teamKey: string
}

async function getAllOwnerNames() {
  console.log("Fetching owner names from all filtered leagues...\n")

  // Get allowed league keys from environment
  const allowedLeagueKeys = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS
  
  if (!allowedLeagueKeys) {
    console.log("ERROR: NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS not found in environment variables.")
    console.log("Please set it in your .env.local file.")
    return
  }

  const leagueKeys = allowedLeagueKeys.split(',').map(k => k.trim()).filter(Boolean)
  
  if (leagueKeys.length === 0) {
    console.log("No league keys found in NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS")
    return
  }

  console.log(`Found ${leagueKeys.length} league keys\n`)

  // Store all owner info with team names and years
  const ownerInfoList: OwnerInfo[] = []
  const yahooOwnerNames = new Set<string>()

  // Fetch standings for each league
  for (const leagueKey of leagueKeys) {
    const year = getYearFromLeagueKey(leagueKey)
    console.log(`Fetching ${year} season (${leagueKey})...`)
    
    try {
      const standings = await fetchLeagueStandings(leagueKey)
      
      if (standings && standings.length > 0) {
        standings.forEach(team => {
          const yahooOwnerName = team.owner_name || team.name
          if (yahooOwnerName && yahooOwnerName !== "Unknown") {
            ownerInfoList.push({
              yahooOwnerName,
              teamName: team.name,
              year,
              teamKey: team.team_key,
            })
            yahooOwnerNames.add(yahooOwnerName)
          }
        })
        console.log(`  ✓ Found ${standings.length} teams`)
      } else {
        console.log(`  ✗ No standings data`)
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log("\n" + "=".repeat(80))
  console.log("OWNER NAMES WITH TEAM NAMES AND YEARS")
  console.log("=".repeat(80) + "\n")

  // Group by Yahoo owner name
  const ownerGroups = new Map<string, OwnerInfo[]>()
  ownerInfoList.forEach(info => {
    if (!ownerGroups.has(info.yahooOwnerName)) {
      ownerGroups.set(info.yahooOwnerName, [])
    }
    ownerGroups.get(info.yahooOwnerName)!.push(info)
  })

  // Sort owner names alphabetically
  const sortedOwners = Array.from(yahooOwnerNames).sort()

  console.log(`Total unique Yahoo owner names: ${sortedOwners.length}\n`)

  // Display each owner with all their team names and years
  sortedOwners.forEach((owner, index) => {
    const infos = ownerGroups.get(owner) || []
    const seasons = [...new Set(infos.map(i => i.year))].sort()
    
    console.log(`${index + 1}. Yahoo Owner Name: "${owner}"`)
    console.log(`   Appears in ${seasons.length} season(s): ${seasons.join(", ")}`)
    console.log(`   Team names by year:`)
    
    // Group by year and show team names
    const byYear = new Map<string, string[]>()
    infos.forEach(info => {
      if (!byYear.has(info.year)) {
        byYear.set(info.year, [])
      }
      byYear.get(info.year)!.push(info.teamName)
    })
    
    seasons.forEach(year => {
      const teamNames = byYear.get(year) || []
      const uniqueTeamNames = [...new Set(teamNames)]
      console.log(`      ${year}: ${uniqueTeamNames.join(", ")}`)
    })
    console.log()
  })

  // Generate mapping template with comments
  console.log("=".repeat(80))
  console.log("MAPPING TEMPLATE (copy to lib/owner-names.ts)")
  console.log("=".repeat(80) + "\n")
  console.log("export const OWNER_NAME_MAPPINGS: OwnerNameMapping = {")
  
  sortedOwners.forEach(owner => {
    const infos = ownerGroups.get(owner) || []
    const seasons = [...new Set(infos.map(i => i.year))].sort()
    const teamNames = [...new Set(infos.map(i => i.teamName))]
    
    // Add comment with context
    console.log(`  // "${owner}" - ${seasons.length} season(s): ${seasons.join(", ")}`)
    console.log(`  //   Team names: ${teamNames.slice(0, 3).join(", ")}${teamNames.length > 3 ? "..." : ""}`)
    console.log(`  "${owner}": "", // TODO: Enter standardized name here`)
    console.log()
  })
  
  console.log("}\n")

  // Also generate a detailed CSV-like format for easy editing
  console.log("=".repeat(80))
  console.log("DETAILED LIST (for reference)")
  console.log("=".repeat(80) + "\n")
  console.log("Yahoo Owner Name | Year | Team Name")
  console.log("-".repeat(80))
  
  sortedOwners.forEach(owner => {
    const infos = ownerGroups.get(owner) || []
    // Sort by year
    infos.sort((a, b) => a.year.localeCompare(b.year))
    
    infos.forEach((info, idx) => {
      const prefix = idx === 0 ? owner : ""
      console.log(`${prefix.padEnd(20)} | ${info.year.padEnd(4)} | ${info.teamName}`)
    })
    console.log()
  })
}

// Run the script
getAllOwnerNames()
  .then(() => {
    console.log("\nDone!")
    console.log("\nNext steps:")
    console.log("1. Review the owner names above")
    console.log("2. Identify duplicates (e.g., 'Jeff' vs 'Jeff Miller', 'Matt' vs 'Matthew')")
    console.log("3. Fill in the standardized names in the mapping template")
    console.log("4. Copy the completed mappings to lib/owner-names.ts")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Script failed:", error)
    process.exit(1)
  })
