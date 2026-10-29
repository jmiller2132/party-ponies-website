import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const PP_MANAGERS = new Set([
  'Jeff Miller','Isiah Campbell','Carter Van Ekeren','Darien Ruzzicone',
  'Josh Werner','Jack Harvarth','Liam Mahoney','Chris Dahlke',
  'Mitch Widule','Ian Gerrity','Matt Kinderman','Ben Simon',
  'Jeff Steers','Matt De Starkey','Dennis Garvey',
])

async function main() {
  // 1. Verify 461.l.55059 = Party Ponies 2025
  console.log('=== 461.l.55059 (2025) standings ===')
  const { data: s } = await sb.from('league_standings')
    .select('owner_name,rank,wins,losses,points_for')
    .eq('league_key', '461.l.55059')
    .eq('season', '2025')
    .is('week', null)
    .order('rank', { ascending: true })

  if (s && s.length > 0) {
    s.forEach((r: any) => {
      const match = PP_MANAGERS.has(r.owner_name) ? '✓' : '✗ NOT PP'
      console.log(`  ${r.rank}. ${r.owner_name} (${r.wins}-${r.losses}, PF=${parseFloat(r.points_for).toFixed(1)}) ${match}`)
    })
    const ppMatch = s.filter((r: any) => PP_MANAGERS.has(r.owner_name)).length
    console.log(`  Match: ${ppMatch}/${s.length} Party Ponies managers`)
  } else {
    // Try matchups
    const { data: m } = await sb.from('matchups').select('team1_key,team2_key,team1_name,team2_name')
      .eq('league_key', '461.l.55059').eq('season', '2025').eq('week', 1)
    const names = new Set<string>()
    ;(m || []).forEach((r: any) => { names.add(r.team1_name); names.add(r.team2_name) })
    console.log(`  No standings, week-1 team names from matchups: ${[...names].join(', ')}`)
  }

  // 2. Token info
  console.log('\n=== yahoo_tokens table ===')
  const { data: toks } = await sb.from('yahoo_tokens').select('user_id,updated_at,access_token')
  console.log(`  ${toks?.length || 0} token(s) stored`)
  toks?.forEach((t: any) => console.log(`  user_id=${t.user_id?.slice(0,20)}... updated=${t.updated_at}`))

  // 3. Check recompute standings for 2025 to see PP team names
  console.log('\n=== sds_plus_cache 2025 teams ===')
  const { data: c } = await sb.from('sds_plus_cache').select('owner_name,sds_plus_rank,final_rank')
    .eq('league_key', '461.l.55059').eq('season', '2025').order('final_rank', { ascending: true })
  ;(c || []).forEach((r: any) => console.log(`  Rank ${r.final_rank}: ${r.owner_name}`))
}

main().catch(console.error)
