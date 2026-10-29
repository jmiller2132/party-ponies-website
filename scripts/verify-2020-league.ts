/**
 * verify-2020-league.ts
 * Determines which 2020 Yahoo league key is the real Party Ponies.
 *
 * Two candidates appear in the DB:
 *   399.l.25680  — listed in NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS
 *   399.l.55059  — appears in matchups table; same league ID as 2021 Party Ponies (406.l.55059)
 *
 * Known truth (from user):
 *   - Isiah Campbell won as the 3 seed
 *   - Jeff Miller was runner-up (4 seed)
 *   - Carter Van Ekeren and Darien Ruzzicone had first-round byes (seeds 1 and 2)
 *
 * Usage: npx tsx scripts/verify-2020-league.ts
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

const PARTY_PONIES_MANAGERS = new Set([
  'Jeff Miller', 'Isiah Campbell', 'Carter Van Ekeren', 'Darien Ruzzicone',
  'Josh Werner', 'Jack Harvarth', 'Liam Mahoney', 'Chris Dahlke',
  'Mitch Widule', 'Ian Gerrity',
])

async function checkLeague(leagueKey: string) {
  console.log(`\n─── League key: ${leagueKey} ───`)

  // 1. Check league_standings
  const { data: standings } = await supabase
    .from('league_standings')
    .select('owner_name, rank, wins, losses, ties, points_for')
    .eq('league_key', leagueKey)
    .eq('season', '2020')
    .is('week', null)
    .order('rank', { ascending: true })

  if (standings && standings.length > 0) {
    console.log(`  Standings from league_standings table (${standings.length} teams):`)
    standings.forEach((s: any) => {
      const match = PARTY_PONIES_MANAGERS.has(s.owner_name) ? '✓' : '✗ NOT PP'
      console.log(`    Rank ${s.rank}: ${s.owner_name} (${s.wins}-${s.losses}-${s.ties}, PF=${parseFloat(s.points_for).toFixed(1)}) ${match}`)
    })
    const ppMatch = standings.filter((s: any) => PARTY_PONIES_MANAGERS.has(s.owner_name)).length
    console.log(`  Party Ponies team match: ${ppMatch}/${standings.length}`)
  } else {
    console.log('  No standings in league_standings table')
  }

  // 2. Check matchups table for team owners
  const { data: matchups } = await supabase
    .from('matchups')
    .select('team1_key, team2_key, team1_name, team2_name, week')
    .eq('league_key', leagueKey)
    .eq('season', '2020')
    .eq('week', 1)

  if (matchups && matchups.length > 0) {
    console.log(`  Week 1 matchup team names:`)
    const names = new Set<string>()
    matchups.forEach((m: any) => {
      if (m.team1_name) names.add(m.team1_name)
      if (m.team2_name) names.add(m.team2_name)
    })
    names.forEach(n => console.log(`    ${n}`))
  } else {
    console.log('  No week 1 matchup data')
  }

  // 3. Check post-regular-season matchups (week 14+)
  const { data: postReg } = await supabase
    .from('matchups')
    .select('week, team1_key, team2_key, team1_name, team2_name, team1_points, team2_points')
    .eq('league_key', leagueKey)
    .eq('season', '2020')
    .gte('week', 14)
    .order('week', { ascending: true })

  if (postReg && postReg.length > 0) {
    console.log(`  Post-reg matchups (wk 14+):`)
    postReg.forEach((m: any) => {
      console.log(`    Wk ${m.week}: ${m.team1_name ?? m.team1_key} (${parseFloat(m.team1_points).toFixed(1)}) vs ${m.team2_name ?? m.team2_key} (${parseFloat(m.team2_points).toFixed(1)})`)
    })
  } else {
    console.log('  No post-reg matchups cached')
  }
}

async function main() {
  console.log('════════════════════════════════')
  console.log('  2020 League ID Verification')
  console.log('════════════════════════════════')
  console.log('\nKnown truth: Isiah Campbell won (3 seed), Jeff Miller runner-up (4 seed),')
  console.log('Carter Van Ekeren and Darien Ruzzicone had byes (seeds 1 and 2).\n')

  await checkLeague('399.l.25680')
  await checkLeague('399.l.55059')

  // Also check 2021 (406.l.55059) as reference point for league ID 55059
  console.log('\n─── Reference: 406.l.55059 (2021 Party Ponies in ALLOWED_LEAGUE_KEYS) ───')
  const { data: standings2021 } = await supabase
    .from('league_standings')
    .select('owner_name, rank')
    .eq('league_key', '406.l.55059')
    .eq('season', '2021')
    .is('week', null)
    .order('rank', { ascending: true })
  if (standings2021 && standings2021.length > 0) {
    console.log(`  2021 Party Ponies teams: ${standings2021.map((s: any) => s.owner_name).join(', ')}`)
  } else {
    console.log('  No 2021 standings cached for 406.l.55059')
  }

  console.log('\n════════════════════════════════')
  console.log('  Conclusion:')
  console.log('  If 399.l.55059 has Carter/Darien/Isiah/Jeff + matches known results → that is Party Ponies 2020')
  console.log('  If 399.l.25680 matches → ALLOWED_LEAGUE_KEYS is correct')
  console.log('  If 399.l.25680 has wrong teams → ALLOWED_LEAGUE_KEYS needs fixing to 399.l.55059')
  console.log('════════════════════════════════\n')
}

main().catch(console.error)
