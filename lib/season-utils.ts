/**
 * Utility functions for working with seasons
 */

import { getAllLeaguesWithMetadata } from "./league-utils"

/**
 * Get the league key for a specific year/season
 */
export async function getLeagueKeyForYear(year: number): Promise<string | null> {
  const leagues = await getAllLeaguesWithMetadata()
  
  // Find the league that matches the year
  const league = leagues.find(l => {
    const season = parseInt(l.season) || 0
    return season === year
  })
  
  return league?.league_key || null
}

/**
 * Get all available years from configured league keys
 */
export async function getAvailableYears(): Promise<number[]> {
  const leagues = await getAllLeaguesWithMetadata()
  
  // Extract years from leagues and sort
  const years = leagues
    .map(l => parseInt(l.season) || 0)
    .filter(year => year > 0)
    .sort((a, b) => b - a) // Newest first
  
  return years
}
