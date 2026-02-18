/**
 * Debug script to check owner names in standings
 * Run with: npx tsx scripts/debug-owner-names.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { getLeagueStandings } from '../app/actions/yahoo-actions'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugOwnerNames() {
  console.log('🔍 Checking owner names in database...\n')

  // Check if owner_name column exists
  const { data: columns, error: columnError } = await supabase
    .from('league_standings')
    .select('*')
    .limit(1)

  if (columnError) {
    console.error('❌ Error checking columns:', columnError.message)
    console.log('\n💡 Make sure you ran the migration to add owner_name column!')
    return
  }

  if (columns && columns.length > 0) {
    const firstRow = columns[0]
    const hasOwnerNameColumn = 'owner_name' in firstRow
    console.log(`✅ owner_name column exists: ${hasOwnerNameColumn}`)
    
    if (!hasOwnerNameColumn) {
      console.log('\n💡 Run this SQL in Supabase:')
      console.log('ALTER TABLE league_standings ADD COLUMN IF NOT EXISTS owner_name TEXT;')
      return
    }
  }

  // Check a sample of cached standings
  const { data: cachedStandings, error } = await supabase
    .from('league_standings')
    .select('league_key, season, team_name, owner_name, rank')
    .is('week', null)
    .order('season', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error fetching standings:', error.message)
    return
  }

  console.log(`\n📊 Sample of cached standings (showing first 20):\n`)
  
  const groupedBySeason = new Map<string, typeof cachedStandings>()
  cachedStandings?.forEach(row => {
    const season = row.season
    if (!groupedBySeason.has(season)) {
      groupedBySeason.set(season, [])
    }
    groupedBySeason.get(season)!.push(row)
  })

  groupedBySeason.forEach((rows, season) => {
    console.log(`\n${season} Season:`)
    rows.forEach(row => {
      const hasOwnerName = row.owner_name && row.owner_name !== row.team_name
      const status = hasOwnerName ? '✅' : '❌'
      console.log(`  ${status} ${row.team_name} (Rank ${row.rank})`)
      if (row.owner_name) {
        console.log(`     Owner: ${row.owner_name}`)
      } else {
        console.log(`     Owner: MISSING`)
      }
    })
  })

  // Test fetching fresh data for one league
  console.log('\n\n🔄 Testing fresh fetch from Yahoo API...\n')
  
  const testLeagueKey = cachedStandings?.[0]?.league_key
  if (testLeagueKey) {
    console.log(`Fetching fresh data for league: ${testLeagueKey}`)
    try {
      const result = await getLeagueStandings(testLeagueKey)
      if (result.success && result.data) {
        const champion = result.data.find(t => t.rank === 1)
        console.log(`\n✅ Fresh fetch successful!`)
        console.log(`   Champion team: ${champion?.name}`)
        console.log(`   Champion owner: ${champion?.owner_name || 'MISSING'}`)
        
        if (!champion?.owner_name || champion.owner_name === champion.name) {
          console.log(`\n⚠️  WARNING: Owner name is missing or same as team name!`)
          console.log(`   This suggests fetchLeagueStandings is not populating owner_name correctly.`)
        }
      } else {
        console.log(`❌ Fresh fetch failed: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ Error fetching fresh data:', error)
    }
  }
}

debugOwnerNames().catch(console.error)
