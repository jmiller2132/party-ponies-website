/**
 * Script to find and identify "--hidden--" owners by year
 * 
 * Run with: npm run find-hidden
 * 
 * This will show you all "--hidden--" owners with their team names and years
 * so you can identify who they are and add year-specific mappings.
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
import { parseStringPromise } from 'xml2js'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

// Import Yahoo API functions directly
import { getValidYahooToken } from "../lib/yahoo-auth"

const YAHOO_FANTASY_BASE_URL = 'https://fantasysports.yahooapis.com/fantasy/v2'

// Get league keys from environment (avoiding Supabase dependency)
function getAllLeagueKeys(): string[] {
  const allowedLeagueKeys = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS
  if (!allowedLeagueKeys) {
    throw new Error("NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS not found in environment variables")
  }
  return allowedLeagueKeys.split(',').map(k => k.trim()).filter(Boolean)
}

// Fetch team managers to get raw owner names (before standardization)
async function fetchRawTeamManagers(leagueKey: string): Promise<Map<string, string>> {
  const accessToken = await getValidYahooToken()
  const managerMap = new Map<string, string>()

  try {
    const url = `${YAHOO_FANTASY_BASE_URL}/league/${leagueKey}/teams;format=json`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return managerMap
    }

    // Read response as text first to check if it's XML or JSON
    const responseText = await response.text()
    let data: any

    // Check if response is XML
    if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
      try {
        data = await parseStringPromise(responseText)
      } catch (e) {
        console.error(`Error parsing XML for ${leagueKey}:`, e)
        return managerMap
      }
    } else {
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error(`Error parsing JSON for ${leagueKey}:`, e)
        return managerMap
      }
    }

    // Handle XML format
    if (data.fantasy_content?.league) {
      const leagues = Array.isArray(data.fantasy_content.league) ? data.fantasy_content.league : [data.fantasy_content.league]
      const leagueData = leagues[0]
      const teams = leagueData?.teams?.[0]?.team || []
      const teamsList = Array.isArray(teams) ? teams : [teams]

      teamsList.forEach((team: any) => {
        const teamData = Array.isArray(team) ? team[0] : team
        const teamKey = Array.isArray(teamData.team_key) ? teamData.team_key[0] : teamData.team_key
        const managers = teamData?.managers?.[0]?.manager || []
        const managersList = Array.isArray(managers) ? managers : [managers]
        
        if (managersList.length > 0) {
          const manager = managersList[0]
          const nickname = Array.isArray(manager.nickname) ? manager.nickname[0] : manager.nickname
          const ownerName = nickname || '--hidden--'
          if (teamKey && ownerName) {
            managerMap.set(teamKey, ownerName)
          }
        } else {
          // No manager found, mark as hidden
          if (teamKey) {
            managerMap.set(teamKey, '--hidden--')
          }
        }
      })
    }
    // Handle JSON format
    else if (data.fantasy_content?.league?.[0]?.teams) {
      const teams = data.fantasy_content.league[0].teams
      Object.keys(teams)
        .filter(key => key !== 'count' && !isNaN(Number(key)))
        .forEach(key => {
          const team = teams[key][0]
          const teamKey = team.team_key
          const managers = team.managers
          if (managers && managers.length > 0) {
            const manager = managers[0]
            const nickname = manager.nickname || manager.name || '--hidden--'
            if (teamKey && nickname) {
              managerMap.set(teamKey, nickname)
            }
          } else {
            // No manager found, mark as hidden
            if (teamKey) {
              managerMap.set(teamKey, '--hidden--')
            }
          }
        })
    }
  } catch (error) {
    console.error(`Error fetching managers for ${leagueKey}:`, error)
  }

  return managerMap
}

// Fetch raw standings (before standardization)
async function fetchRawStandings(leagueKey: string): Promise<any[]> {
  const accessToken = await getValidYahooToken()
  const managerMap = await fetchRawTeamManagers(leagueKey)

  const url = `${YAHOO_FANTASY_BASE_URL}/league/${leagueKey}/standings;format=json`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch standings: ${response.status}`)
  }

  // Read response as text first to check if it's XML or JSON
  const responseText = await response.text()
  let data: any

  // Check if response is XML
  if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
    try {
      data = await parseStringPromise(responseText)
    } catch (e) {
      throw new Error(`Failed to parse XML response: ${e instanceof Error ? e.message : String(e)}`)
    }
  } else {
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  let standings: any[] = []

  // Handle XML format
  if (data.fantasy_content?.league) {
    const leagues = Array.isArray(data.fantasy_content.league) ? data.fantasy_content.league : [data.fantasy_content.league]
    const leagueData = leagues[0]
    
    if (leagueData?.standings && Array.isArray(leagueData.standings)) {
      const standingsData = leagueData.standings[0]
      const teamsList = standingsData?.teams?.[0]?.team || []
      const teams = Array.isArray(teamsList) ? teamsList : [teamsList]
      
      standings = teams.map((team: any) => {
        const teamData = Array.isArray(team) ? team[0] : team
        const teamKey = Array.isArray(teamData.team_key) ? teamData.team_key[0] : teamData.team_key
        const name = Array.isArray(teamData.name) ? teamData.name[0] : teamData.name
        const standingsInfo = teamData.team_standings?.[0] || {}
        const rank = parseInt(Array.isArray(standingsInfo.rank) ? standingsInfo.rank[0] : standingsInfo.rank || '0')
        const pointsAgainst = parseFloat(Array.isArray(standingsInfo.points_against) ? standingsInfo.points_against[0] : standingsInfo.points_against || '0')
        const outcomeTotals = standingsInfo.outcome_totals?.[0] || {}
        const wins = parseInt(Array.isArray(outcomeTotals.wins) ? outcomeTotals.wins[0] : outcomeTotals.wins || '0')
        const losses = parseInt(Array.isArray(outcomeTotals.losses) ? outcomeTotals.losses[0] : outcomeTotals.losses || '0')
        const ties = parseInt(Array.isArray(outcomeTotals.ties) ? outcomeTotals.ties[0] : outcomeTotals.ties || '0')
        
        // Points For from team_points or stats
        const teamPoints = teamData.team_points?.[0] || {}
        const totalPoints = Array.isArray(teamPoints.total) ? teamPoints.total[0] : teamPoints.total
        const pointsFor = parseFloat(totalPoints || '0')
        
        // Get RAW owner name (before standardization)
        const rawOwnerName = managerMap.get(teamKey) || 'Unknown'
        
        return {
          team_key: teamKey,
          name: name || 'Unknown',
          owner_name: rawOwnerName, // RAW, not standardized
          rank: rank,
          points_for: pointsFor,
          points_against: pointsAgainst,
          wins: wins,
          losses: losses,
          ties: ties,
        }
      }).sort((a, b) => a.rank - b.rank)
    }
  }
  // Handle JSON format
  else if (data.fantasy_content?.league?.[0]?.standings?.[0]?.teams) {
    const teams = data.fantasy_content.league[0].standings[0].teams
    
    standings = Object.keys(teams)
      .filter(key => key !== 'count' && !isNaN(Number(key)))
      .map(key => {
        const team = teams[key][0]
        const stats = team?.team_stats?.stats
        const pointsFor = stats?.find((s: any) => s.stat_id === '1')?.value 
          || team?.team_points?.total 
          || '0'
        
        // Get RAW owner name (before standardization)
        const rawOwnerName = managerMap.get(team.team_key) || 'Unknown'
        
        return {
          team_key: team.team_key,
          name: team.name,
          owner_name: rawOwnerName, // RAW, not standardized
          rank: parseInt(team.team_standings?.rank || '0'),
          points_for: parseFloat(pointsFor),
          points_against: parseFloat(team.team_standings?.points_against || '0'),
          wins: parseInt(team.team_standings?.outcome_totals?.wins || '0'),
          losses: parseInt(team.team_standings?.outcome_totals?.losses || '0'),
          ties: parseInt(team.team_standings?.outcome_totals?.ties || '0'),
        }
      })
      .sort((a, b) => a.rank - b.rank)
  }

  return standings
}

// Map game keys to years (Yahoo's game key format)
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

interface HiddenOwnerInfo {
  year: string
  leagueKey: string
  teamName: string
  teamKey: string
  rank: number
  wins: number
  losses: number
  pointsFor: number
}

async function findHiddenOwners() {
  console.log("=".repeat(80))
  console.log("FINDING --hidden-- OWNERS BY YEAR")
  console.log("=".repeat(80) + "\n")
  
  const leagueKeys = getAllLeagueKeys()
  const hiddenOwners: HiddenOwnerInfo[] = []
  
  console.log(`Checking ${leagueKeys.length} leagues...\n`)
  
  // Fetch standings for all leagues
  for (const leagueKey of leagueKeys) {
    const year = getYearFromLeagueKey(leagueKey)
    
    try {
      console.log(`Fetching ${year} season (${leagueKey})...`)
      const standings = await fetchRawStandings(leagueKey)
      
      // Find all "--hidden--" owners
      const hiddenTeams = standings.filter(team => 
        team.owner_name === "--hidden--" || 
        team.owner_name?.startsWith("--hidden--")
      )
      
      hiddenTeams.forEach(team => {
        hiddenOwners.push({
          year,
          leagueKey: leagueKey,
          teamName: team.name,
          teamKey: team.team_key,
          rank: team.rank,
          wins: team.wins,
          losses: team.losses,
          pointsFor: team.points_for,
        })
      })
      if (hiddenTeams.length > 0) {
        console.log(`  ✓ Found ${hiddenTeams.length} --hidden-- owner(s)`)
      } else {
        console.log(`  ✓ No --hidden-- owners found`)
      }
    } catch (error) {
      console.error(`  ✗ Error fetching ${leagueKey}:`, error instanceof Error ? error.message : String(error))
    }
  }
  
  if (hiddenOwners.length === 0) {
    console.log("✅ No --hidden-- owners found!\n")
    return
  }
  
  // Group by year
  const byYear = new Map<string, HiddenOwnerInfo[]>()
  hiddenOwners.forEach(owner => {
    if (!byYear.has(owner.year)) {
      byYear.set(owner.year, [])
    }
    byYear.get(owner.year)!.push(owner)
  })
  
  // Display results
  console.log(`Found ${hiddenOwners.length} --hidden-- owner(s) across ${byYear.size} year(s):\n`)
  
  const sortedYears = Array.from(byYear.keys()).sort()
  
  sortedYears.forEach(year => {
    const owners = byYear.get(year)!
    console.log(`📅 ${year} (${owners.length} team${owners.length > 1 ? 's' : ''}):`)
    console.log("-".repeat(80))
    
    owners.forEach(owner => {
      console.log(`  Team: "${owner.teamName}"`)
      console.log(`  Record: ${owner.wins}-${owner.losses} (Rank: ${owner.rank})`)
      console.log(`  Points For: ${owner.pointsFor.toFixed(2)}`)
      console.log(`  League Key: ${owner.leagueKey}`)
      console.log()
    })
  })
  
  // Generate mapping template
  console.log("=".repeat(80))
  console.log("MAPPING TEMPLATE (copy to lib/owner-names.ts)")
  console.log("=".repeat(80) + "\n")
  
  sortedYears.forEach(year => {
    const owners = byYear.get(year)!
    owners.forEach(owner => {
      console.log(`  "--hidden-- (${year})": "TODO: Enter owner name here", // Team: ${owner.teamName}`)
    })
  })
  
  console.log("\n" + "=".repeat(80))
  console.log("INSTRUCTIONS:")
  console.log("=".repeat(80))
  console.log("1. Review the team names above to identify who each --hidden-- owner is")
  console.log("2. Open lib/owner-names.ts")
  console.log("3. Add the year-specific mappings shown above, replacing 'TODO' with actual names")
  console.log("4. Example: \"--hidden-- (2013)\": \"Jack Harvarth\",")
  console.log("=".repeat(80) + "\n")
}

// Run the script
findHiddenOwners()
  .then(() => {
    console.log("✅ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Error:", error)
    process.exit(1)
  })
