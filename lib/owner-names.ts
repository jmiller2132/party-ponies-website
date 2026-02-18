/**
 * Owner Name Standardization
 * 
 * Maps Yahoo owner names to standardized names across all seasons.
 * This ensures consistent display even when Yahoo names change or vary.
 * 
 * To update: Fill in the standardized names below based on the output from:
 *   npm run get-owners
 */

export interface OwnerNameMapping {
  [yahooOwnerName: string]: string
}

/**
 * Map game keys to years (Yahoo's game key format)
 */
const GAME_KEY_TO_YEAR: Record<string, number> = {
  "314": 2013,
  "331": 2014,
  "348": 2015,
  "359": 2016,
  "371": 2017,
  "380": 2018,
  "390": 2019,
  "399": 2020,
  "406": 2021,
  "414": 2022,
  "423": 2023,
  "449": 2024,
  "461": 2025,
}

/**
 * Extract year from league key (format: {game_key}.l.{league_id})
 */
export function getYearFromLeagueKey(leagueKey: string): number | undefined {
  const gameKey = leagueKey.split('.')[0]
  return GAME_KEY_TO_YEAR[gameKey]
}

/**
 * Standardized owner name mappings
 * 
 * Format: "Yahoo Owner Name": "Standardized Name"
 * 
 * Fill in the standardized names below. The system will:
 * 1. Try to match exact Yahoo owner names
 * 2. Fall back to Yahoo owner name if no mapping exists
 * 3. Use team name as final fallback
 */
export const OWNER_NAME_MAPPINGS: OwnerNameMapping = {
  // "--hidden--" owners are automatically split by year and team name
  // Format: "--hidden-- (YEAR) [TEAM_NAME]": "Owner Name"
  // When multiple hidden owners exist in same year, team name distinguishes them
  
  // 2013 mappings
  "--hidden-- (2013) [Fear Boners]": "Ben Simon",
  "--hidden-- (2013) [Rhymes With Punt]": "Jack Harvath",
  
  // 2014 mappings
  "--hidden-- (2014) [Fear Boners]": "Ben Simon",
  "--hidden-- (2014) [Rhymes With Punt]": "Jack Harvath",
  
  // 2015 mappings
  "--hidden-- (2015) [Fear Boners]": "Ben Simon",
  "--hidden-- (2015) [The Fighting ACL's]": "Jack Harvath",
  
  // 2016 mappings
  "--hidden-- (2016) [Fear Boners]": "Ben Simon",
  "--hidden-- (2016) [The Fighting ACL's]": "Jack Harvath",
  
  // Fallback mapping (used if no year-specific mapping exists):
  "--hidden--": "Unknown (Hidden Owner)",

  // "C Money" - 13 season(s): 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: C Money, Balls, Lamar Jackson, Mr. Big Tiddy, C $, Kareem Pies...
  "C Money": "Carter Van Ekeren", // TODO: Enter standardized name here

  // "Darien" - 13 season(s): 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: The Sausage Wallets, ¯\_(ツ)_/¯, Oof, Griddy SZN, Etienne Some Ass...
  "Darien": "Darien Ruzzicone", // TODO: Enter standardized name here

  // "Dennis" - 1 season(s): 2013
  //   Team names: Dennis's Team
  "Dennis": "Dennis Garvey", // TODO: Enter standardized name here

  // "Ian" - 7 season(s): 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: Mahomes Boys, Kings of the Hill, Mixon It Up, Cooper Troopers...
  "Ian": "Ian Gerrity", // TODO: Enter standardized name here

  // "Isiah" - 6 season(s): 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: Isis, Puk-A-Boo, JK Dobby
  "Isiah": "Isiah Campbell", // TODO: Enter standardized name here

  // "Jack" - 9 season(s): 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: Jaboo's Dawgs, Kareem Hunt= Bad Guy, Jack Goff, Arthur Smith Hate Club...
  "Jack": "Jack Harvarth", // TODO: Enter standardized name here

  // "Jeff" - 2 season(s): 2017, 2018
  //   Team names: Kirk's Cousins, s'QUAD
  //   NOTE: Also see "Jeff Miller" (13 seasons) - may be the same person
  "Jeff": "Jeff Steers", // TODO: Enter standardized name here

  // "Jeff Miller" - 13 season(s): 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: Show me your TD's, Dirty Sanchez, COCKS, Miller Time, Milllllllller Time...
  //   NOTE: Also see "Jeff" (2 seasons) - may be the same person
  "Jeff Miller": "Jeff Miller", // TODO: Enter standardized name here

  // "Josh" - 9 season(s): 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: Team Dry Sockets, JuJu on that beat, Mixon is BACK, Odoo-doo Beckham...
  "Josh": "Josh Werner", // TODO: Enter standardized name here

  // "Kim" - 4 season(s): 2013, 2014, 2015, 2016
  //   Team names: flaccoroni & cheese, FF is my Forte, Slim Shady
  "Kim": "Josh Werner", // TODO: Enter standardized name here

  // "Liam" - 13 season(s): 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: Lee, The Notorious I.N.T., This One's For Danny, Dad Wrestlers, LiLi, Li...
  "Liam": "Liam Mahoney", // TODO: Enter standardized name here

  // "Matt" - 6 season(s): 2013, 2014, 2015, 2017, 2018, 2019
  //   Team names: Kadillac Kindy, Kindamin, Jen Eiden's Snatch, Ramily, My Ball Zach Ertz
  //   NOTE: Also see "Matthew" (1 season) - may be the same person
  "Matt": "Matt Kinderman", // TODO: Enter standardized name here

  // "Matthew" - 1 season(s): 2014
  //   Team names: Jennifer Eiden
  //   NOTE: Also see "Matt" (6 seasons) - may be the same person
  "Matthew": "Matt De Starkey", // TODO: Enter standardized name here

  // "Mitch" - 10 season(s): 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: Widule, Harrison Butkickers, Golden Taint, Baby Don't Got Dak, Gimme Rodgers...
  "Mitch": "Mitch Widule", // TODO: Enter standardized name here

  // "Vicki" - 4 season(s): 2013, 2014, 2015, 2016
  //   Team names: Steers, Victorious Secret
  "Vicki": "Jeff Steers", // TODO: Enter standardized name here

  // "chris" - 11 season(s): 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
  //   Team names: Swiss Roll, Snake Killer, Champ, LaPorta Potty 🏆🏆🏆, Peekabuka 🏆🏆🏆
  //   NOTE: Lowercase "chris" - consider capitalizing to "Chris"
  "chris": "Chris Dahlke", // TODO: Enter standardized name here
}

/**
 * Get standardized owner name from Yahoo owner name
 * 
 * @param yahooOwnerName - The owner name from Yahoo API
 * @param teamName - Fallback team name if no mapping exists
 * @param year - Optional year/season to distinguish "--hidden--" owners
 * @returns Standardized owner name
 */
export function getStandardizedOwnerName(
  yahooOwnerName: string | undefined,
  teamName?: string,
  year?: number | string
): string {
  if (!yahooOwnerName) {
    return teamName || "Unknown"
  }

  // Special handling for "--hidden--" owners: append year and team name to make them unique
  if (yahooOwnerName === "--hidden--" && year) {
    const yearStr = typeof year === 'number' ? year.toString() : year
    
    // First try: year + team name (for multiple hidden owners in same year)
    if (teamName) {
      // Normalize team name: trim whitespace for exact matching
      const normalizedTeamName = teamName.trim()
      const teamSpecificKey = `--hidden-- (${yearStr}) [${normalizedTeamName}]`
      const teamSpecificMapping = OWNER_NAME_MAPPINGS[teamSpecificKey]
      if (teamSpecificMapping) {
        return teamSpecificMapping
      }
      
      // Also try without normalization in case mapping was added with different formatting
      const teamSpecificKeyAlt = `--hidden-- (${yearStr}) [${teamName}]`
      const teamSpecificMappingAlt = OWNER_NAME_MAPPINGS[teamSpecificKeyAlt]
      if (teamSpecificMappingAlt) {
        return teamSpecificMappingAlt
      }
    }
    
    // Second try: year only (for single hidden owner per year)
    const yearOnlyKey = `--hidden-- (${yearStr})`
    const yearOnlyMapping = OWNER_NAME_MAPPINGS[yearOnlyKey]
    if (yearOnlyMapping) {
      return yearOnlyMapping
    }
    
    // Fall back to generic "--hidden--" mapping if no year-specific one exists
    const genericMapping = OWNER_NAME_MAPPINGS["--hidden--"]
    if (genericMapping) {
      return genericMapping
    }
    
    // If no mapping exists, return year-specific identifier
    return yearOnlyKey
  }

  // Check if we have a mapping for this Yahoo owner name
  const standardizedName = OWNER_NAME_MAPPINGS[yahooOwnerName]
  if (standardizedName) {
    // If mapping is empty string, use Yahoo name as fallback
    return standardizedName || yahooOwnerName
  }

  // Return Yahoo owner name if no mapping exists
  return yahooOwnerName
}

/**
 * Get all standardized owner names (for reference)
 */
export function getAllStandardizedNames(): string[] {
  return Object.values(OWNER_NAME_MAPPINGS).filter(name => name !== "")
}
