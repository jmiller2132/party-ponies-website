/**
 * Fixes stale "Jack Harvath" (misspelled) entries in Supabase caches,
 * and also removes the stale manager_stats_cache so it rebuilds with correct names.
 *
 * Run: npx tsx scripts/fix-manager-names.ts
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

const OLD = 'Jack Harvath'
const NEW = 'Jack Harvarth'

async function run() {
  console.log(`Fixing name: "${OLD}" → "${NEW}"\n`)

  // ── league_standings ────────────────────────────────────────────────────
  const { data: standRows, error: standErr } = await supabase
    .from('league_standings')
    .select('id, owner_name, season')
    .eq('owner_name', OLD)

  if (standErr) {
    console.error('league_standings select error:', standErr.message)
  } else {
    console.log(`league_standings: found ${standRows?.length ?? 0} rows with old name`)
    if (standRows && standRows.length > 0) {
      const { error } = await supabase
        .from('league_standings')
        .update({ owner_name: NEW })
        .eq('owner_name', OLD)
      if (error) console.error('  update error:', error.message)
      else console.log(`  ✓ Updated ${standRows.length} rows`)
    }
  }

  // ── sds_plus_cache ──────────────────────────────────────────────────────
  const { data: sdsRows, error: sdsErr } = await supabase
    .from('sds_plus_cache')
    .select('id, owner_name, season')
    .eq('owner_name', OLD)

  if (sdsErr) {
    console.error('sds_plus_cache select error:', sdsErr.message)
  } else {
    console.log(`\nsds_plus_cache: found ${sdsRows?.length ?? 0} rows with old name`)
    if (sdsRows && sdsRows.length > 0) {
      const { error } = await supabase
        .from('sds_plus_cache')
        .update({ owner_name: NEW })
        .eq('owner_name', OLD)
      if (error) console.error('  update error:', error.message)
      else console.log(`  ✓ Updated ${sdsRows.length} rows`)
    }
  }

  // ── manager_stats_cache — delete both old and new entries ───────────────
  // After clearing, the app will rebuild on next page load with correct merged data.
  console.log('\nmanager_stats_cache: clearing all entries (will rebuild on next load)...')
  const { error: delErr } = await supabase
    .from('manager_stats_cache')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all

  if (delErr) console.error('  delete error:', delErr.message)
  else console.log('  ✓ Cleared manager_stats_cache')

  // ── head_to_head_cache — delete entries involving the old name ──────────
  console.log('\nhead_to_head_cache: clearing entries with old name...')
  const { error: h2h1 } = await supabase
    .from('head_to_head_cache')
    .delete()
    .eq('manager1', OLD)
  const { error: h2h2 } = await supabase
    .from('head_to_head_cache')
    .delete()
    .eq('manager2', OLD)
  if (h2h1) console.error('  manager1 delete error:', h2h1.message)
  if (h2h2) console.error('  manager2 delete error:', h2h2.message)
  if (!h2h1 && !h2h2) console.log('  ✓ Cleared head_to_head_cache entries')

  // ── Verify ─────────────────────────────────────────────────────────────
  console.log('\nVerification:')
  const { data: jackNew } = await supabase
    .from('league_standings')
    .select('season, owner_name')
    .eq('owner_name', NEW)
    .is('week', null)
    .order('season', { ascending: true })

  if (jackNew && jackNew.length > 0) {
    console.log(`  ✓ "${NEW}" appears in league_standings for seasons:`)
    jackNew.forEach(r => console.log(`    ${r.season}`))
  } else {
    console.log(`  ⚠ "${NEW}" not found in league_standings after update`)
  }

  const { data: jackOld } = await supabase
    .from('league_standings')
    .select('id')
    .eq('owner_name', OLD)
    .limit(1)
  if (jackOld && jackOld.length > 0) {
    console.log(`  ✗ "${OLD}" still appears in league_standings — manual check needed`)
  } else {
    console.log(`  ✓ "${OLD}" is gone from league_standings`)
  }

  console.log('\nDone. Reload the manager pages to see the merged Jack Harvarth profile.')
}

run()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1) })
