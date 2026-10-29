/**
 * cleanup-stray-leagues.ts
 * Finds and removes rows in matchups, league_standings, league_settings_cache,
 * and sds_plus_cache whose league_key is NOT in NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS.
 * manager_stats_cache has no league_key column (it's per-manager), so it is
 * rebuilt cleanly by recompute-ppsi instead.
 *
 * Safe to run multiple times — no-ops if already clean.
 *
 * Usage: npx tsx scripts/cleanup-stray-leagues.ts
 *   (or)  npx tsx scripts/cleanup-stray-leagues.ts --dry-run   (report only, no deletes)
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

const DRY_RUN = process.argv.includes('--dry-run')

const ALLOWED_KEYS = (process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS || '')
  .split(',').map(k => k.trim()).filter(Boolean)

const TABLES_WITH_LEAGUE_KEY = [
  'matchups',
  'league_standings',
  'league_settings_cache',
  'sds_plus_cache',
] as const

async function main() {
  console.log('\n════════════════════════════════════════')
  console.log(`  Stray League Cleanup${DRY_RUN ? ' (DRY RUN — no deletes)' : ''}`)
  console.log('════════════════════════════════════════\n')

  if (ALLOWED_KEYS.length === 0) {
    console.error('No NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS found in .env.local — aborting.')
    process.exit(1)
  }

  console.log(`Allowed league keys (${ALLOWED_KEYS.length}):`)
  ALLOWED_KEYS.forEach(k => console.log(`  ${k}`))
  console.log('')

  let totalStray = 0

  for (const table of TABLES_WITH_LEAGUE_KEY) {
    // Fetch distinct stray league keys and their counts
    const { data: allRows, error } = await supabase
      .from(table)
      .select('league_key')

    if (error) {
      console.error(`  Error reading ${table}: ${error.message}`)
      continue
    }

    if (!allRows || allRows.length === 0) {
      console.log(`${table}: 0 rows total — skipping`)
      continue
    }

    // Group by league_key
    const countByKey: Record<string, number> = {}
    for (const row of allRows as any[]) {
      countByKey[row.league_key] = (countByKey[row.league_key] || 0) + 1
    }

    const strayKeys = Object.keys(countByKey).filter(k => !ALLOWED_KEYS.includes(k))

    if (strayKeys.length === 0) {
      console.log(`${table}: ✓ clean (${allRows.length} rows, all in allowed keys)`)
      continue
    }

    const strayTotal = strayKeys.reduce((s, k) => s + countByKey[k], 0)
    totalStray += strayTotal
    console.log(`${table}: ⚠ ${strayTotal} stray rows in ${strayKeys.length} non-allowed league(s):`)
    for (const k of strayKeys.sort()) {
      console.log(`    ${k}: ${countByKey[k]} rows`)
    }

    if (!DRY_RUN) {
      // Delete stray rows for each stray key
      for (const k of strayKeys) {
        const { error: delErr } = await supabase
          .from(table)
          .delete()
          .eq('league_key', k)
        if (delErr) {
          console.error(`    ✗ Delete failed for ${k} in ${table}: ${delErr.message}`)
        } else {
          console.log(`    ✓ Deleted ${countByKey[k]} rows for ${k} from ${table}`)
        }
      }
    }

    console.log('')
  }

  // manager_stats_cache has no league_key; it's rebuilt by recompute-ppsi, so no cleanup needed
  console.log('manager_stats_cache: rebuilt by recompute-ppsi (no league_key column to clean)')
  console.log('')

  if (DRY_RUN) {
    console.log(`Total stray rows found: ${totalStray} (dry run — nothing deleted)`)
  } else {
    console.log(`Total stray rows deleted: ${totalStray}`)
  }

  console.log('\n════════════════════════════════════════\n')
}

main().catch(console.error)
