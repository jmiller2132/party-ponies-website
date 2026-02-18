/**
 * Clear all cached standings to force fresh fetch with owner names
 * Run with: npx tsx scripts/clear-standings-cache.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function clearStandingsCache() {
  console.log('🗑️  Clearing all cached standings...\n')

  // Delete all cached standings (final standings only, week = null)
  const { data, error } = await supabase
    .from('league_standings')
    .delete()
    .is('week', null)

  if (error) {
    console.error('❌ Error clearing cache:', error.message)
    return
  }

  console.log('✅ Cache cleared successfully!')
  console.log('\n💡 Now refresh your website - it will re-fetch all standings with owner names.')
}

clearStandingsCache().catch(console.error)
