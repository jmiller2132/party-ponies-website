/**
 * Examine what's in the matchups DB cache for each season —
 * which weeks are stored, and whether any playoff weeks made it in.
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

const GAME_KEY_TO_YEAR: Record<string, string> = {
  '314': '2013', '331': '2014', '348': '2015', '359': '2016',
  '371': '2017', '380': '2018', '390': '2019', '399': '2020',
  '406': '2021', '414': '2022', '423': '2023', '449': '2024', '461': '2025',
}

async function main() {
  console.log('\n═══ MATCHUPS DB CACHE — week ranges per season ═══\n')

  const { data, error } = await supabase
    .from('matchups')
    .select('league_key, season, week, team1_key, team2_key, team1_points, team2_points, status')
    .order('league_key').order('week')

  if (error) { console.error(error.message); return }
  if (!data || data.length === 0) { console.log('No matchup rows in DB'); return }

  const byLeague = new Map<string, any[]>()
  for (const row of data as any[]) {
    const key = `${row.league_key}:${row.season}`
    if (!byLeague.has(key)) byLeague.set(key, [])
    byLeague.get(key)!.push(row)
  }

  const known = (process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
  const knownSeasons = new Map(known.map(lk => [lk, GAME_KEY_TO_YEAR[lk.split('.')[0]]]))

  // Known reg-season lengths
  const REG_WEEKS: Record<string, number> = {
    '2013': 14, '2014': 14, '2015': 14, '2016': 14, '2017': 14,
    '2018': 13, '2019': 13, '2020': 13,
    '2021': 14, '2022': 14, '2023': 14, '2024': 14, '2025': 14,
  }

  console.log('League Key          | Season | Total rows | Reg-season rows | Post-reg rows | Weeks stored (post-reg = *)')
  console.log('--------------------|--------|------------|-----------------|---------------|----------------------------')

  for (const [key, rows] of byLeague) {
    const [leagueKey, season] = key.split(':')
    const regWks = REG_WEEKS[season] ?? 14
    const regRows = rows.filter((r: any) => r.week <= regWks)
    const postRows = rows.filter((r: any) => r.week > regWks)
    const weeks = [...new Set(rows.map((r: any) => r.week))].sort((a, b) => a - b)
    const weeksStr = weeks.map((w: number) => w > regWks ? `${w}*` : w).join(',')
    
    const missingReg = Array.from({ length: regWks }, (_, i) => i + 1)
      .filter(w => !rows.some((r: any) => r.week === w))
    
    console.log(`${leagueKey.padEnd(19)} | ${(season ?? '?').padEnd(6)} | ${String(rows.length).padStart(10)} | ${String(regRows.length).padStart(15)} | ${String(postRows.length).padStart(13)} | ${weeksStr}`)
    if (missingReg.length > 0) console.log(`  ⚠ Missing reg-season weeks: ${missingReg.join(', ')}`)
    
    // For post-reg rows: show number of unique teams = potential playoff indicator
    if (postRows.length > 0) {
      const byWeek = new Map<number, Set<string>>()
      postRows.forEach((r: any) => {
        if (!byWeek.has(r.week)) byWeek.set(r.week, new Set())
        byWeek.get(r.week)!.add(r.team1_key)
        byWeek.get(r.week)!.add(r.team2_key)
      })
      for (const [wk, teams] of byWeek) {
        const matchups = postRows.filter((r: any) => r.week === wk).length
        console.log(`  Week ${wk} (post-reg): ${matchups} matchups, ${teams.size} teams`)
      }
    }
  }

  // Check for seasons with no matchup data at all
  console.log('\n═══ Seasons with no matchup data in DB ═══')
  for (const [lk, season] of knownSeasons) {
    const key = `${lk}:${season}`
    if (!byLeague.has(key)) {
      console.log(`  ${season} (${lk}): NO DATA`)
    }
  }

  // Show 2019 matchup data specifically
  const league2019 = known.find(k => k.startsWith('390.'))
  if (league2019) {
    const key2019 = `${league2019}:2019`
    const rows2019 = byLeague.get(key2019) || []
    console.log(`\n═══ 2019 matchup details (${rows2019.length} rows) ═══`)
    if (rows2019.length > 0) {
      const weeks = [...new Set(rows2019.map((r: any) => r.week))].sort((a, b) => a - b)
      console.log(`  Weeks: ${weeks.join(', ')}`)
      // Show week 12 presence (expected missing)
      const wk12 = rows2019.filter((r: any) => r.week === 12)
      console.log(`  Week 12 rows: ${wk12.length} (${wk12.length === 0 ? 'MISSING' : 'present'})`)
      // Count unique teams
      const teams = new Set(rows2019.flatMap((r: any) => [r.team1_key, r.team2_key]))
      console.log(`  Unique teams: ${teams.size}`)
      // Sample a few rows
      rows2019.slice(0, 3).forEach((r: any) => {
        console.log(`  ${r.team1_key} vs ${r.team2_key}: ${r.team1_points}-${r.team2_points} (wk${r.week})`)
      })
    }
  }
}

main().catch(console.error)
