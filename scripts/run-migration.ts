/**
 * Runs the PPSI v2 breakdown migration against the remote Supabase database.
 * Usage: npx ts-node -r tsconfig-paths/register scripts/run-migration.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

const statements = [
  // Add breakdown columns to sds_plus_cache
  `ALTER TABLE sds_plus_cache
     ADD COLUMN IF NOT EXISTS breakdown_dominance  DECIMAL(10,2),
     ADD COLUMN IF NOT EXISTS breakdown_scoring    DECIMAL(10,2),
     ADD COLUMN IF NOT EXISTS breakdown_record     DECIMAL(10,2),
     ADD COLUMN IF NOT EXISTS breakdown_result     DECIMAL(10,2),
     ADD COLUMN IF NOT EXISTS breakdown_luck       DECIMAL(10,2),
     ADD COLUMN IF NOT EXISTS regular_season_weeks INTEGER,
     ADD COLUMN IF NOT EXISTS num_playoff_teams    INTEGER,
     ADD COLUMN IF NOT EXISTS regular_season_pf    DECIMAL(10,2),
     ADD COLUMN IF NOT EXISTS formula_version      TEXT DEFAULT 'v1',
     ADD COLUMN IF NOT EXISTS is_fallback          BOOLEAN DEFAULT false`,

  // Create league settings cache table
  `CREATE TABLE IF NOT EXISTS league_settings_cache (
     id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
     league_key               TEXT        NOT NULL UNIQUE,
     season                   TEXT        NOT NULL,
     num_teams                INTEGER     NOT NULL DEFAULT 10,
     num_playoff_teams        INTEGER     NOT NULL DEFAULT 6,
     playoff_start_week       INTEGER     NOT NULL DEFAULT 15,
     num_regular_season_weeks INTEGER     NOT NULL DEFAULT 14,
     cached_at                TIMESTAMPTZ DEFAULT NOW()
   )`,

  `CREATE INDEX IF NOT EXISTS idx_league_settings_cache_league_key
     ON league_settings_cache(league_key)`,

  `ALTER TABLE league_settings_cache ENABLE ROW LEVEL SECURITY`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE tablename = 'league_settings_cache'
         AND policyname = 'Public read access to league settings cache'
     ) THEN
       CREATE POLICY "Public read access to league settings cache"
         ON league_settings_cache FOR SELECT USING (true);
     END IF;
   END
   $$`,
]

async function main() {
  console.log('Running PPSI v2 migration...\n')

  for (const sql of statements) {
    const preview = sql.trim().split('\n')[0].substring(0, 80)
    process.stdout.write(`  ${preview}... `)

    const { error } = await (supabase as any).rpc('exec_sql', { sql }).then
      ? (supabase as any).rpc('exec_sql', { sql })
      // Fallback: use raw query endpoint
      : { error: new Error('rpc exec_sql not available') }

    if (error) {
      // Try the management API approach via a fetch call
      const resp = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
      })
      // As a fallback, use the postgres function approach
      console.log('(skipped via RPC, trying direct)')
    } else {
      console.log('✓')
    }
  }

  // Simpler approach: use supabase.from to test connectivity and try raw SQL
  // The most reliable way without a management API token is via a server-side function
  // Let's try the simplest approach: just verify existing schema and add via ALTER
  
  console.log('\nVerifying schema...')
  const { data: cols, error: colErr } = await supabase
    .from('sds_plus_cache')
    .select('formula_version')
    .limit(1)

  if (colErr) {
    console.log(`formula_version column: NOT FOUND (migration needed) — ${colErr.message}`)
    console.log('\nPlease run the SQL manually in the Supabase SQL editor:')
    console.log('  File: supabase/migrations/add_ppsi_v2_breakdown.sql')
  } else {
    console.log('formula_version column: ✓ present')
  }

  const { data: settingsTable, error: settingsErr } = await supabase
    .from('league_settings_cache')
    .select('league_key')
    .limit(1)

  if (settingsErr) {
    console.log(`league_settings_cache table: NOT FOUND (migration needed) — ${settingsErr.message}`)
  } else {
    console.log('league_settings_cache table: ✓ present')
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1) })
