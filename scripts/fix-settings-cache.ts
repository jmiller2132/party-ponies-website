/**
 * Fixes the league_settings_cache for 2018, 2019, 2020 seasons.
 * These seasons had 13-week regular seasons (playoff_start_week = 14),
 * but the cache was populated with the wrong default of 14 weeks.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Evidence: scoreboard for 2018 and 2020 returned 134 entries
// = 13 weeks × 10 teams (130) + 2 week-14 playoff matchups × 2 teams (4)
// => playoff_start_week = 14, num_regular_season_weeks = 13
const CORRECTIONS: Record<string, { playoff_start_week: number; num_regular_season_weeks: number }> = {
  '2018': { playoff_start_week: 14, num_regular_season_weeks: 13 },
  '2019': { playoff_start_week: 14, num_regular_season_weeks: 13 }, // 403 on scoreboard, assumed same as 2018/2020
  '2020': { playoff_start_week: 14, num_regular_season_weeks: 13 },
}

async function main() {
  console.log('Fixing league_settings_cache for 2018/2019/2020...\n')

  for (const [season, correction] of Object.entries(CORRECTIONS)) {
    const { data: existing, error: fetchErr } = await supabase
      .from('league_settings_cache')
      .select('league_key, num_regular_season_weeks, playoff_start_week, season')
      .eq('season', season)

    if (fetchErr) {
      console.error(`  Error fetching ${season}:`, fetchErr.message)
      continue
    }

    console.log(`  ${season}: found ${existing?.length ?? 0} cache rows`)
    existing?.forEach((r: any) => console.log(`    league=${r.league_key} current: regWks=${r.num_regular_season_weeks} startWk=${r.playoff_start_week}`))

    if (existing && existing.length > 0) {
      const { error: updateErr } = await supabase
        .from('league_settings_cache')
        .update({
          playoff_start_week: correction.playoff_start_week,
          num_regular_season_weeks: correction.num_regular_season_weeks,
          cached_at: new Date().toISOString(),
        })
        .eq('season', season)

      if (updateErr) console.error(`  Update error:`, updateErr.message)
      else console.log(`  → Updated to: regWks=${correction.num_regular_season_weeks} startWk=${correction.playoff_start_week}`)
    }
  }

  // Also clear sds_plus_cache for these seasons so they get recomputed
  console.log('\nClearing sds_plus_cache for 2018/2019/2020 (forces recompute)...')
  for (const season of ['2018', '2019', '2020']) {
    const { error } = await supabase.from('sds_plus_cache').delete().eq('season', season)
    if (error) console.error(`  Error clearing ${season}:`, error.message)
    else console.log(`  ${season}: cleared`)
  }

  console.log('\nDone. Run `npm run recompute-ppsi` to recompute these 3 seasons.')
}

main().catch(console.error)
