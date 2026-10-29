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

  // Select all columns from sds_plus_cache to see what exists
  const { data, error } = await s.from('sds_plus_cache').select('*').limit(1)
  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('sds_plus_cache columns:', Object.keys(data?.[0] ?? {}))
    console.log('Sample row:', JSON.stringify(data?.[0], null, 2))
  }

  // Count rows by formula_version
  const { data: d2 } = await s
    .from('sds_plus_cache')
    .select('formula_version, season')
    .order('season')
  
  const counts: Record<string, number> = {}
  d2?.forEach((r: any) => {
    const k = `${r.season}:${r.formula_version}`
    counts[k] = (counts[k] || 0) + 1
  })
  console.log('\nRows by season:version:', JSON.stringify(counts, null, 2))
}

main().catch(console.error)
