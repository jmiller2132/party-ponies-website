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

  // Check matchup_cache
  const { data: mc, error: mce } = await s.from('matchup_cache').select('league_key').limit(1)
  if (mce) console.log('matchup_cache:', mce.message)
  else console.log('matchup_cache exists, rows:', mc?.length ?? 0)

  // Check sds_plus_cache breakdown columns
  const { data: sd, error: sde } = await s.from('sds_plus_cache').select('breakdown_dominance, breakdown_scoring, breakdown_record, breakdown_result, breakdown_luck, formula_version').limit(2)
  if (sde) console.log('sds_plus_cache breakdown cols:', sde.message)
  else console.log('sds_plus_cache breakdown cols OK, sample:', JSON.stringify(sd?.[0]))

  // Check league_settings_cache
  const { data: ls, error: lse } = await s.from('league_settings_cache').select('*').limit(5)
  if (lse) console.log('league_settings_cache:', lse.message)
  else console.log('league_settings_cache rows:', ls?.length, JSON.stringify(ls?.map(r => `${r.season}: playoffs=${r.num_playoff_teams} startWk=${r.playoff_start_week}`)))
}

main().catch(console.error)
