import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Query information_schema to get real column names
  const { data, error } = await s.rpc('exec_sql', {
    sql: `SELECT column_name, data_type FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'sds_plus_cache' 
          ORDER BY ordinal_position`
  })
  
  if (error) {
    // Try a different approach - just try inserting a minimal row
    console.log('RPC not available, error:', error.message)
    
    // Try to insert with just known columns
    const { error: ie } = await s.from('sds_plus_cache').insert({
      league_key: 'test', season: 'test', owner_name: 'test', team_key: 'test',
      score: 0, cached_at: new Date().toISOString()
    })
    if (ie) {
      console.log('Insert error (shows missing cols):', ie.message)
    } else {
      console.log('Minimal insert worked - now checking columns')
      await s.from('sds_plus_cache').delete().eq('league_key', 'test')
    }

    // Try with breakdown cols
    const { error: ie2 } = await s.from('sds_plus_cache').insert({
      league_key: 'test2', season: 'test', owner_name: 'test', team_key: 'test',
      score: 0, breakdown_dominance: 0, breakdown_scoring: 0, breakdown_record: 0,
      breakdown_result: 0, breakdown_luck: 0, formula_version: 'v2',
      regular_season_weeks: 14, num_playoff_teams: 6, regular_season_pf: 0,
      is_fallback: false, cached_at: new Date().toISOString()
    })
    if (ie2) {
      console.log('Full insert error:', ie2.message)
    } else {
      console.log('Full insert (no rank) worked!')
      await s.from('sds_plus_cache').delete().eq('league_key', 'test2')
    }

    // Try with sds_rank (old column name)
    const { error: ie3 } = await s.from('sds_plus_cache').insert({
      league_key: 'test3', season: 'test', owner_name: 'test', team_key: 'test',
      score: 0, sds_rank: 1, cached_at: new Date().toISOString()
    })
    if (ie3) {
      console.log('sds_rank insert error:', ie3.message)
    } else {
      console.log('sds_rank insert worked!')
      await s.from('sds_plus_cache').delete().eq('league_key', 'test3')
    }

  } else {
    console.log('Columns:', data)
  }
}

main().catch(console.error)
