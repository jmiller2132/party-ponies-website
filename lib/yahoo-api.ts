/**
 * Yahoo Fantasy Sports API Client
 * Reference: https://developer.yahoo.com/fantasysports/guide/
 */

import { getValidYahooToken } from './yahoo-auth'
import { parseStringPromise } from 'xml2js'
import { getStandardizedOwnerName } from './owner-names'

const YAHOO_FANTASY_BASE_URL = 'https://fantasysports.yahooapis.com/fantasy/v2'

interface YahooLeague {
  league_key: string
  name: string
  season: string
  game_code?: string // e.g., "nfl", "nba", "mlb"
  is_public?: boolean
}

export interface YahooStanding {
  team_key: string
  name: string
  owner_name?: string // Manager/owner name
  rank: number
  points_for: number
  points_against: number
  wins: number
  losses: number
  ties: number
}

/**
 * Fetch team data with managers to get owner names
 */
async function fetchTeamManagers(leagueKey: string, userId?: string): Promise<Map<string, string>> {
  const accessToken = await getValidYahooToken(userId)
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
      return managerMap // Return empty map if teams fetch fails
    }

    const responseText = await response.text()
    let data: any

    if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
      const xmlData = await parseStringPromise(responseText)
      data = xmlData
    } else {
      data = JSON.parse(responseText)
    }

    // Extract manager names from teams data
    // XML format
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
          const managerName = Array.isArray(manager.nickname) ? manager.nickname[0] : manager.nickname
          if (teamKey && managerName) {
            managerMap.set(teamKey, managerName)
          }
        }
      })
    }
    // JSON format
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
            const managerName = manager.nickname || manager.name
            if (teamKey && managerName) {
              managerMap.set(teamKey, managerName)
            }
          }
        })
    }
  } catch (error) {
    console.error("Error fetching team managers:", error)
  }

  return managerMap
}

/**
 * Fetch league standings from Yahoo API
 * Note: Yahoo Fantasy Sports API returns XML by default, but we can request JSON
 */
export async function fetchLeagueStandings(leagueKey: string, userId?: string) {
  const accessToken = await getValidYahooToken(userId)

  // Fetch managers separately to get owner names
  const managerMap = await fetchTeamManagers(leagueKey, userId)
  
  // Extract year from league key for "--hidden--" owner handling
  const { getYearFromLeagueKey } = await import('./owner-names')
  const year = getYearFromLeagueKey(leagueKey)

  const url = `${YAHOO_FANTASY_BASE_URL}/league/${leagueKey}/standings;format=json`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  // Read response as text first to check if it's XML or JSON
  const responseText = await response.text()
  
  if (!response.ok) {
    throw new Error(`Failed to fetch standings: ${response.status} - ${responseText.substring(0, 500)}`)
  }

  let data: any
  let isXml = false

  // Check if response is XML (Yahoo sometimes returns XML even when JSON is requested)
  if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
    isXml = true
    // Parse XML response
    try {
      const xmlData = await parseStringPromise(responseText)
      data = xmlData
    } catch (e) {
      throw new Error(`Failed to parse XML response: ${e instanceof Error ? e.message : String(e)}`)
    }
  } else {
    // Try to parse as JSON
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Failed to parse response as JSON: ${responseText.substring(0, 500)}`)
    }
  }
  
  let standings: any
  let transformedStandings: YahooStanding[] = []

  // Handle XML format
  if (isXml && data.fantasy_content?.league) {
    const leagues = Array.isArray(data.fantasy_content.league) ? data.fantasy_content.league : [data.fantasy_content.league]
    const leagueData = leagues[0]
    
    if (leagueData?.standings && Array.isArray(leagueData.standings)) {
      const standingsData = leagueData.standings[0]
      const teamsList = standingsData?.teams?.[0]?.team || []
      const teams = Array.isArray(teamsList) ? teamsList : [teamsList]
      
      transformedStandings = teams.map((team: any) => {
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
        
        // If no manager found in map, treat as "--hidden--"
        const rawOwnerName = managerMap.get(teamKey) || '--hidden--'
        
        return {
          team_key: teamKey,
          name: name || 'Unknown',
          owner_name: getStandardizedOwnerName(rawOwnerName, name, year),
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
  else if (data.fantasy_content) {
    const league = data.fantasy_content?.league?.[0]
    standings = league?.standings?.[0]?.teams
    
    if (!standings) {
      throw new Error('Invalid standings data from Yahoo API')
    }

    // Transform Yahoo format to our format
    // Yahoo uses numeric keys (0, 1, 2...) and a 'count' key
    transformedStandings = Object.keys(standings)
      .filter(key => key !== 'count' && !isNaN(Number(key)))
      .map(key => {
        const team = standings[key][0]
        const stats = team?.team_stats?.stats
        
        // Points For is typically stat_id "1" or can be found in team_points
        const pointsFor = stats?.find((s: any) => s.stat_id === '1')?.value 
          || team?.team_points?.total 
          || '0'
        
        // If no manager found in map, treat as "--hidden--"
        const rawOwnerName = managerMap.get(team.team_key) || '--hidden--'
        
        return {
          team_key: team.team_key,
          name: team.name,
          owner_name: getStandardizedOwnerName(rawOwnerName, team.name, year),
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

  if (transformedStandings.length === 0) {
    throw new Error('No standings data found in Yahoo API response')
  }

  return transformedStandings
}

/**
 * Fetch current week matchups from Yahoo API
 */
export async function fetchCurrentWeekMatchups(leagueKey: string, userId?: string) {
  const accessToken = await getValidYahooToken(userId)

  // Fetch managers to get owner names
  const managerMap = await fetchTeamManagers(leagueKey, userId)
  
  // Extract year from league key for "--hidden--" owner handling
  const { getYearFromLeagueKey } = await import('./owner-names')
  const year = getYearFromLeagueKey(leagueKey)

  const url = `${YAHOO_FANTASY_BASE_URL}/league/${leagueKey}/scoreboard;format=json`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch matchups: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const league = data.fantasy_content?.league?.[0]
  const scoreboard = league?.scoreboard?.[0]
  const matchups = scoreboard?.matchups

  if (!matchups) {
    return []
  }

  // Transform Yahoo format to our format
  // Yahoo uses numeric keys for matchups
  const transformedMatchups = Object.keys(matchups)
    .filter(key => key !== 'count' && !isNaN(Number(key)))
    .map(key => {
      const matchup = matchups[key][0]
      const teams = matchup?.teams
      
      const team1 = teams?.[0]?.[0]
      const team2 = teams?.[1]?.[0]
      
        return {
          matchup_key: matchup.matchup_key,
          week: parseInt(matchup.week || '0'),
          team1: {
            key: team1?.team_key,
            name: team1?.name,
            owner_name: getStandardizedOwnerName(managerMap.get(team1?.team_key), team1?.name, year),
            points: parseFloat(team1?.team_points?.total || '0'),
          },
          team2: {
            key: team2?.team_key,
            name: team2?.name,
            owner_name: getStandardizedOwnerName(managerMap.get(team2?.team_key), team2?.name, year),
            points: parseFloat(team2?.team_points?.total || '0'),
          },
          status: matchup.status,
        }
    })

  return transformedMatchups
}

/**
 * Fetch matchups for a specific week
 */
export async function fetchWeekMatchups(leagueKey: string, week: number, userId?: string) {
  // Check cache first
  const { getCachedMatchups, cacheMatchups } = await import('./cache')
  const { getYearFromLeagueKey } = await import('./owner-names')
  const yearNum = getYearFromLeagueKey(leagueKey)
  const year = yearNum?.toString() || new Date().getFullYear().toString()
  
  const cachedMatchups = await getCachedMatchups(leagueKey, year, week)
  if (cachedMatchups) {
    // If owner_name is already cached, use it. Otherwise fetch managers.
    const needsOwnerNames = cachedMatchups.some(m => !m.team1?.owner_name || !m.team2?.owner_name)
    if (needsOwnerNames) {
      const managerMap = await fetchTeamManagers(leagueKey, userId)
      return cachedMatchups.map(m => ({
        ...m,
        team1: {
          ...m.team1,
          owner_name: m.team1.owner_name || getStandardizedOwnerName(managerMap.get(m.team1.key), m.team1.name, yearNum),
        },
        team2: {
          ...m.team2,
          owner_name: m.team2.owner_name || getStandardizedOwnerName(managerMap.get(m.team2.key), m.team2.name, yearNum),
        },
      }))
    }
    return cachedMatchups
  }
  
  const accessToken = await getValidYahooToken(userId)

  // Fetch managers to get owner names
  const managerMap = await fetchTeamManagers(leagueKey, userId)

  const url = `${YAHOO_FANTASY_BASE_URL}/league/${leagueKey}/scoreboard;week=${week};format=json`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch week ${week} matchups: ${response.status} - ${errorText}`)
  }

  const responseText = await response.text()
  let data: any

  if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
    const xmlData = await parseStringPromise(responseText)
    data = xmlData
  } else {
    data = JSON.parse(responseText)
  }

  const league = data.fantasy_content?.league?.[0]
  const scoreboard = league?.scoreboard?.[0]
  const matchups = scoreboard?.matchups

  if (!matchups) {
    return []
  }

  // Handle both XML and JSON formats
  let transformedMatchups: any[] = []
  
  if (Array.isArray(matchups)) {
    // XML format
    const matchupList = matchups[0]?.matchup || []
    const matchupsToProcess = Array.isArray(matchupList) ? matchupList : [matchupList]
    
    transformedMatchups = matchupsToProcess.map((matchup: any) => {
      const matchupData = Array.isArray(matchup) ? matchup[0] : matchup
      const teams = matchupData?.teams?.[0]?.team || []
      const teamsList = Array.isArray(teams) ? teams : [teams]
      
      const team1 = teamsList[0] || {}
      const team2 = teamsList[1] || {}
      
      // Extract team_key (always an array in XML)
      const team1Key = Array.isArray(team1.team_key) ? team1.team_key[0] : team1.team_key
      const team2Key = Array.isArray(team2.team_key) ? team2.team_key[0] : team2.team_key
      const team1Name = Array.isArray(team1.name) ? team1.name[0] : team1.name
      const team2Name = Array.isArray(team2.name) ? team2.name[0] : team2.name
      
      // Extract team_points - Yahoo API structure: team_points[0].total[0]
      let team1Points = 0
      let team2Points = 0
      
      if (team1.team_points && Array.isArray(team1.team_points) && team1.team_points.length > 0) {
        const tp1 = team1.team_points[0]
        if (tp1?.total) {
          team1Points = parseFloat(Array.isArray(tp1.total) ? tp1.total[0] : tp1.total)
        }
      }
      
      if (team2.team_points && Array.isArray(team2.team_points) && team2.team_points.length > 0) {
        const tp2 = team2.team_points[0]
        if (tp2?.total) {
          team2Points = parseFloat(Array.isArray(tp2.total) ? tp2.total[0] : tp2.total)
        }
      }
      
      return {
        matchup_key: Array.isArray(matchupData.matchup_key) ? matchupData.matchup_key[0] : matchupData.matchup_key,
        week: parseInt(Array.isArray(matchupData.week) ? matchupData.week[0] : matchupData.week || '0'),
        team1: {
          key: team1Key,
          name: team1Name,
          owner_name: getStandardizedOwnerName(managerMap.get(team1Key), team1Name, yearNum),
          points: team1Points,
        },
        team2: {
          key: team2Key,
          name: team2Name,
          owner_name: getStandardizedOwnerName(managerMap.get(team2Key), team2Name, yearNum),
          points: team2Points,
        },
        status: Array.isArray(matchupData.status) ? matchupData.status[0] : matchupData.status,
      }
    })
  } else {
    // JSON format
    transformedMatchups = Object.keys(matchups)
      .filter(key => key !== 'count' && !isNaN(Number(key)))
      .map(key => {
        const matchup = matchups[key][0]
        const teams = matchup?.teams
        
        const team1 = teams?.[0]?.[0]
        const team2 = teams?.[1]?.[0]
        
        return {
          matchup_key: matchup.matchup_key,
          week: parseInt(matchup.week || '0'),
          team1: {
            key: team1?.team_key,
            name: team1?.name,
            owner_name: getStandardizedOwnerName(managerMap.get(team1?.team_key), team1?.name, yearNum),
            points: parseFloat(team1?.team_points?.total || '0'),
          },
          team2: {
            key: team2?.team_key,
            name: team2?.name,
            owner_name: getStandardizedOwnerName(managerMap.get(team2?.team_key), team2?.name, yearNum),
            points: parseFloat(team2?.team_points?.total || '0'),
          },
          status: matchup.status,
        }
      })
  }

  // Cache the results for future requests
  await cacheMatchups(leagueKey, year, week, transformedMatchups)

  return transformedMatchups
}

/**
 * Fetch all weekly scores for a season (for SDS+ calculation)
 * Returns weekly scores for all teams across all regular season weeks
 * Now includes opponent tracking for Strength of Schedule calculation
 */
export async function fetchAllWeeklyScores(leagueKey: string, userId?: string): Promise<Array<{ team_key: string; week: number; points: number; opponent_key?: string }>> {
  const weeklyScores: Array<{ team_key: string; week: number; points: number; opponent_key?: string }> = []
  
  // Fetch weeks 1-14 (typical regular season)
  // We'll try to fetch as many weeks as available
  const weeksToFetch = Array.from({ length: 14 }, (_, i) => i + 1) // Weeks 1-14
  
  let successCount = 0
  let errorCount = 0
  
  for (const week of weeksToFetch) {
    try {
      const matchups = await fetchWeekMatchups(leagueKey, week, userId)
      
      if (matchups && matchups.length > 0) {
        matchups.forEach(matchup => {
          // Handle both team1 and team2
          // Track opponents: team1's opponent is team2, team2's opponent is team1
          if (matchup.team1?.key && matchup.team2?.key) {
            const team1Points = matchup.team1.points || 0
            const team2Points = matchup.team2.points || 0
            
            // Add team1's score with team2 as opponent
            if (team1Points > 0) {
              weeklyScores.push({
                team_key: matchup.team1.key,
                week: matchup.week,
                points: team1Points,
                opponent_key: matchup.team2.key, // Track opponent
              })
            }
            
            // Add team2's score with team1 as opponent
            if (team2Points > 0) {
              weeklyScores.push({
                team_key: matchup.team2.key,
                week: matchup.week,
                points: team2Points,
                opponent_key: matchup.team1.key, // Track opponent
              })
            }
          } else {
            // Fallback: if opponent info is missing, still record the score
            if (matchup.team1?.key) {
              const points = matchup.team1.points || 0
              if (points > 0) {
                weeklyScores.push({
                  team_key: matchup.team1.key,
                  week: matchup.week,
                  points: points,
                  // opponent_key will be undefined if team2 is missing
                })
              }
            }
            if (matchup.team2?.key) {
              const points = matchup.team2.points || 0
              if (points > 0) {
                weeklyScores.push({
                  team_key: matchup.team2.key,
                  week: matchup.week,
                  points: points,
                  // opponent_key will be undefined if team1 is missing
                })
              }
            }
          }
        })
        successCount++
      }
    } catch (error) {
      errorCount++
      // Log first few errors for debugging
      if (errorCount <= 3) {
        console.error(`Error fetching week ${week}:`, error instanceof Error ? error.message : String(error))
      }
      // Continue to next week - some weeks may not exist for past seasons
      continue
    }
  }
  
  // Log summary
  if (weeklyScores.length === 0 && errorCount > 0) {
    console.warn(`Warning: Failed to fetch weekly scores for ${errorCount} weeks. This may be normal for past seasons.`)
  }
  
  return weeklyScores
}

/**
 * Fetch user's leagues from Yahoo API
 */
export async function fetchUserLeagues(userId: string, gameKey?: string) {
  const accessToken = await getValidYahooToken(userId)

  // Try fetching without game key first to get all games, then use the first game's key
  // Yahoo API format: /users;use_login=1/games/leagues;format=json
  const url = `${YAHOO_FANTASY_BASE_URL}/users;use_login=1/games/leagues;format=json`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  // Read response as text first to check if it's XML or JSON
  const responseText = await response.text()
  
  if (!response.ok) {
    throw new Error(`Failed to fetch leagues: ${response.status} - ${responseText.substring(0, 500)}`)
  }

  let data: any
  let isXml = false

  // Check if response is XML (Yahoo sometimes returns XML even when JSON is requested)
  if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
    isXml = true
    // Parse XML response
    try {
      const xmlData = await parseStringPromise(responseText)
      data = xmlData
    } catch (e) {
      throw new Error(`Failed to parse XML response: ${e instanceof Error ? e.message : String(e)}`)
    }
  } else {
    // Try to parse as JSON
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Failed to parse response as JSON: ${responseText.substring(0, 500)}`)
    }
  }
  
  // Parse Yahoo's structure (works for both JSON and XML)
  const leagues: YahooLeague[] = []

  // Handle XML format (xml2js converts XML to nested arrays)
  if (isXml && data.fantasy_content?.users) {
    const users = Array.isArray(data.fantasy_content.users) ? data.fantasy_content.users : [data.fantasy_content.users]
    const user = users[0]?.user
    
    if (user && Array.isArray(user)) {
      const userData = user[0]
      const games = userData?.games
      
      if (games && Array.isArray(games)) {
        const gamesData = games[0]
        const gameList = gamesData?.game || []
        
        // Handle both single game and array of games
        const gamesToProcess = Array.isArray(gameList) ? gameList : [gameList]
        
        gamesToProcess.forEach((game: any) => {
          if (game?.leagues && Array.isArray(game.leagues)) {
            const leaguesData = game.leagues[0]
            const leagueList = leaguesData?.league || []
            
            // Handle both single league and array of leagues
            const leaguesToProcess = Array.isArray(leagueList) ? leagueList : [leagueList]
            
            leaguesToProcess.forEach((league: any) => {
              if (league) {
                // xml2js wraps text content in arrays
                const leagueKey = Array.isArray(league.league_key) ? league.league_key[0] : league.league_key
                const name = Array.isArray(league.name) ? league.name[0] : league.name
                const season = Array.isArray(league.season) 
                  ? league.season[0] 
                  : (Array.isArray(game.season) ? game.season[0] : game.season)
                
                if (leagueKey) {
                  // Extract game code from game object
                  const gameCode = Array.isArray(game.code) ? game.code[0] : (game.code || '')
                  // Check if league is public (public leagues often have 'public' in URL or league settings)
                  const leagueUrl = Array.isArray(league.url) ? league.url[0] : league.url
                  const isPublic = leagueUrl?.includes('public') || leagueUrl?.includes('l.public') || false
                  
                  leagues.push({
                    league_key: leagueKey,
                    name: name || 'Unnamed League',
                    season: season || '',
                    game_code: gameCode,
                    is_public: isPublic,
                  })
                }
              }
            })
          }
        })
      }
    }
  }
  // Handle JSON format
  else if (data.fantasy_content) {
    const user = data.fantasy_content?.users?.[0]?.user?.[0]
    const games = user?.games

    if (games) {
      Object.keys(games)
        .filter(key => key !== 'count' && !isNaN(Number(key)))
        .forEach(gameKey => {
          const game = games[gameKey][0]
          const gameLeagues = game?.leagues
          
          if (gameLeagues) {
            Object.keys(gameLeagues)
              .filter(key => key !== 'count' && !isNaN(Number(key)))
              .forEach(leagueKey => {
                const league = gameLeagues[leagueKey][0]
                const gameCode = game.code || game.game_code
                const isPublic = league.url?.includes('public') || false
                
                leagues.push({
                  league_key: league.league_key,
                  name: league.name,
                  season: league.season || game.season,
                  game_code: gameCode,
                  is_public: isPublic,
                })
              })
          }
        })
    }
  }

  return leagues
}
