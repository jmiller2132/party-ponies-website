import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const ALLOWED = (process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)

async function main() {
  // 1. is_partial column
  const { data: cols, error: colErr } = await sb
    .from('sds_plus_cache')
    .select('is_partial')
    .limit(1)
  console.log('=== is_partial column test ===', colErr ? 'MISSING: '+colErr.message : 'EXISTS (no error selecting it)')

  // 2. League keys in each table — flag strays
  for (const tbl of ['matchups','league_standings','league_settings_cache','sds_plus_cache'] as const) {
    const { data } = await sb.from(tbl).select('league_key')
    const keys = [...new Set((data||[]).map((r:any) => r.league_key))].sort() as string[]
    const strays = keys.filter(k => !ALLOWED.includes(k))
    console.log(`\n=== ${tbl}: ${keys.length} unique keys, ${strays.length} stray ===`)
    keys.forEach(k => {
      const mark = ALLOWED.includes(k) ? '✓' : '✗ STRAY'
      console.log('  '+mark+' '+k)
    })
  }

  // 3. is_partial=true rows
  const { data: partial } = await sb.from('sds_plus_cache').select('season,league_key,is_partial').eq('is_partial', true)
  console.log('\n=== is_partial=true rows ===', partial?.length || 0)
  ;(partial||[]).forEach((r:any) => console.log('  ', r.league_key, r.season))

  // 4. 2020 standings — verify manager names clean
  const { data: s2020 } = await sb.from('league_standings')
    .select('owner_name,rank').eq('league_key','399.l.25680').eq('season','2020').is('week',null).order('rank', {ascending: true})
  console.log('\n=== 2020 standings (399.l.25680) ===')
  ;(s2020||[]).forEach((r:any) => console.log('  '+r.rank+'. '+r.owner_name))

  // 5. Row counts and last_updated per season in sds_plus_cache
  const { data: allSds } = await sb.from('sds_plus_cache').select('season,updated_at')
  const bySeasonMap: Record<string, {count: number, latest: string}> = {}
  ;(allSds||[]).forEach((r:any) => {
    if (!bySeasonMap[r.season]) bySeasonMap[r.season] = { count: 0, latest: r.updated_at }
    bySeasonMap[r.season].count++
    if (r.updated_at > bySeasonMap[r.season].latest) bySeasonMap[r.season].latest = r.updated_at
  })
  console.log('\n=== sds_plus_cache rows per season ===')
  Object.keys(bySeasonMap).sort().forEach(s => {
    const { count, latest } = bySeasonMap[s]
    console.log(`  ${s}: ${count} rows, last_updated=${latest}`)
  })

  // 6. Migrations applied — check supabase_migrations table
  const { data: migs, error: migErr } = await sb
    .from('supabase_migrations' as any)
    .select('version,name')
    .order('version', {ascending: true})
  if (migErr) {
    console.log('\n=== migrations table: '+migErr.message+' ===')
  } else {
    console.log('\n=== applied migrations ===')
    ;(migs||[]).forEach((m:any) => console.log('  '+m.version+' '+m.name))
  }
}

main().catch(console.error)
