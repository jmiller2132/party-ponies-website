/**
 * Script to check if caching is working
 * Run with: npm run check-cache
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables FIRST
config({ path: resolve(process.cwd(), '.env.local') })

// Create Supabase client directly
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }

  return createClient(url, key)
}

async function checkCache() {
  console.log("=".repeat(80))
  console.log("CHECKING CACHE STATUS")
  console.log("=".repeat(80) + "\n")
  
  const supabase = createSupabaseClient()
  
  try {
    // Check if cache tables exist and have data
    console.log("1. Checking cache tables...\n")
    
    // Check standings cache
    const { data: standingsData, error: standingsError, count: standingsCount } = await supabase
      .from('league_standings')
      .select('league_key, season', { count: 'exact' })
      .is('week', null)
      .limit(100)
    
    if (standingsError) {
      console.log("❌ Standings cache table error:", standingsError.message)
    } else if (standingsData && standingsData.length > 0) {
      // Group by league_key and season manually
      const grouped = new Map<string, number>()
      standingsData.forEach((row: any) => {
        const key = `${row.league_key}|${row.season}`
        grouped.set(key, (grouped.get(key) || 0) + 1)
      })
      
      console.log(`✅ Standings cache: ${grouped.size} league(s) cached (${standingsCount} total rows)`)
      Array.from(grouped.entries()).slice(0, 5).forEach(([key, count]) => {
        const [leagueKey, season] = key.split('|')
        console.log(`   - ${leagueKey} (${season}): ${count} teams`)
      })
    } else {
      console.log("⚠️  Standings cache: Empty (no data cached yet)")
    }
    
    console.log()
    
    // Check SDS+ cache
    const { data: sdsData, error: sdsError, count: sdsCount } = await supabase
      .from('sds_plus_cache')
      .select('league_key, season', { count: 'exact' })
      .limit(100)
    
    if (sdsError) {
      console.log("❌ SDS+ cache table error:", sdsError.message)
    } else if (sdsData && sdsData.length > 0) {
      // Group by league_key and season manually
      const grouped = new Map<string, number>()
      sdsData.forEach((row: any) => {
        const key = `${row.league_key}|${row.season}`
        grouped.set(key, (grouped.get(key) || 0) + 1)
      })
      
      console.log(`✅ SDS+ cache: ${grouped.size} league(s) cached (${sdsCount} total rows)`)
      Array.from(grouped.entries()).slice(0, 5).forEach(([key, count]) => {
        const [leagueKey, season] = key.split('|')
        console.log(`   - ${leagueKey} (${season}): ${count} managers`)
      })
    } else {
      console.log("⚠️  SDS+ cache: Empty (no data cached yet)")
    }
    
    console.log()
    
    // Check manager stats cache
    const { data: managerData, error: managerError } = await supabase
      .from('manager_stats_cache')
      .select('owner_name, cached_at')
      .limit(5)
    
    if (managerError) {
      console.log("❌ Manager stats cache table error:", managerError.message)
    } else if (managerData && managerData.length > 0) {
      console.log(`✅ Manager stats cache: ${managerData.length} manager(s) cached`)
      const oldestCache = managerData.reduce((oldest: any, row: any) => {
        const rowDate = new Date(row.cached_at)
        return !oldest || rowDate < oldest ? rowDate : oldest
      }, null)
      console.log(`   - Oldest cache: ${oldestCache ? new Date(oldestCache).toLocaleString() : 'N/A'}`)
      console.log(`   - Sample managers: ${managerData.slice(0, 3).map((m: any) => m.owner_name).join(', ')}`)
    } else {
      console.log("⚠️  Manager stats cache: Empty (no data cached yet)")
    }
    
    console.log("\n" + "=".repeat(80))
    console.log("HOW TO TEST CACHING:")
    console.log("=".repeat(80))
    console.log("1. Visit /managers page - first load will populate cache")
    console.log("2. Refresh the page - should load much faster from cache")
    console.log("3. Check browser Network tab - should see fewer API calls")
    console.log("4. Run this script again to see cached data")
    console.log("=".repeat(80) + "\n")
    
  } catch (error) {
    console.error("❌ Error checking cache:", error)
    process.exit(1)
  }
}

checkCache()
  .then(() => {
    console.log("✅ Cache check complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Error:", error)
    process.exit(1)
  })
