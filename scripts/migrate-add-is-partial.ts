/**
 * migrate-add-is-partial.ts
 * Adds is_partial BOOLEAN DEFAULT false column to sds_plus_cache.
 * Safe to run multiple times (IF NOT EXISTS).
 *
 * Usage: npx tsx scripts/migrate-add-is-partial.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Supabase REST API doesn't expose raw DDL; use the /pg endpoint if available
  // or fall back to verifying via a select.
  // Try inserting a test row with is_partial=false to check if column exists.
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Check if column already exists by selecting it
  const { data, error } = await sb
    .from('sds_plus_cache')
    .select('is_partial')
    .limit(1)

  if (!error) {
    console.log('✓ is_partial column already exists in sds_plus_cache')
    return
  }

  // Column doesn't exist — run DDL via Supabase management API
  console.log('Adding is_partial column...')
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

  // Try management API first
  const mgmtResp = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: 'ALTER TABLE sds_plus_cache ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false;' }),
  })

  if (mgmtResp.ok) {
    console.log('✓ Column added via management API')
    return
  }

  // Fallback: use pg_rest if available
  const pgUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`
  const pgResp = await fetch(pgUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ sql: 'ALTER TABLE sds_plus_cache ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false;' }),
  })

  if (pgResp.ok) {
    console.log('✓ Column added via exec_sql RPC')
    return
  }

  console.error('Could not add column automatically.')
  console.error('Run this SQL in the Supabase Dashboard → SQL Editor:')
  console.error('  ALTER TABLE sds_plus_cache ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false;')
  process.exit(1)
}

main().catch(console.error)
