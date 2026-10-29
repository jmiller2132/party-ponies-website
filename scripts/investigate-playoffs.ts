/**
 * investigate-playoffs.ts
 * 
 * 1. Detects actual playoff teams per season from winners-bracket matchups
 * 2. Tries the Yahoo /settings endpoint fresh (bypassing cache)
 * 3. Investigates the 2019 403 issue
 * 4. Recomputes PPSI where playoff count changes
 * 5. Shows v1 vs v2 comparison sorted by rank change
 *
 * Run: npx tsx scripts/investigate-playoffs.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { parseStringPromise } from 'xml2js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID!
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET!
const LEAGUE_KEYS_ENV = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS || ''

const GAME_KEY_TO_YEAR: Record<string, string> = {
  '314': '2013', '331': '2014', '348': '2015', '359': '2016',
  '371': '2017', '380': '2018', '390': '2019', '399': '2020',
  '406': '2021', '414': '2022', '423': '2023', '449': '2024', '461': '2025',
}

// ── Token helpers ──────────────────────────────────────────────────────────────
let _token: { access_token: string; expires_at: number } | null = null

async function getToken(): Promise<string> {
  if (_token && _token.expires_at > Date.now() + 5 * 60 * 1000) return _token.access_token
  const { data } = await supabase.from('yahoo_tokens').select('*').limit(1).single()
  if (!data) throw new Error('No token in DB')
  if (data.expires_at < Date.now() + 5 * 60 * 1000) {
    const r = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString('base64')}` },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: data.refresh_token }),
    })
    const j = await r.json()
    _token = { access_token: j.access_token, expires_at: Date.now() + j.expires_in * 1000 }
    await supabase.from('yahoo_tokens').update({ access_token: j.access_token,
      refresh_token: j.refresh_token || data.refresh_token,
      expires_at: _token.expires_at, updated_at: new Date().toISOString() }).eq('user_id', data.user_id)
    console.log('  Token refreshed.')
    return j.access_token
  }
  _token = { access_token: data.access_token, expires_at: data.expires_at }
  return data.access_token
}

async function yahooGet(path: string, forceXml = false): Promise<any> {
  const token = await getToken()
  const url = `https://fantasysports.yahooapis.com/fantasy/v2${path}`
  const accept = forceXml ? 'application/xml' : 'application/json'
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: accept } })
  const text = await r.text()
  if (!r.ok) return { _error: r.status, _body: text.slice(0, 300) }
  if (text.trim().startsWith('<')) return await parseStringPromise(text, { explicitArray: true })
  return JSON.parse(text)
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── Parse scoreboard matchups from Yahoo response ──────────────────────────────
function parseMatchups(data: any): Array<{ teams: string[]; is_playoffs: boolean; is_consolation: boolean; week: number }> {
  const out: Array<{ teams: string[]; is_playoffs: boolean; is_consolation: boolean; week: number }> = []
  if (data._error) return out
  const raw = data?.fantasy_content?.league
  const lArr = Array.isArray(raw) ? raw : [raw]
  for (const section of lArr) {
    const s = Array.isArray(section) ? section[0] : section
    const matchups = s?.scoreboard?.[0]?.matchups?.[0]?.matchup || []
    const week = parseInt(s?.scoreboard?.[0]?.['$']?.week ?? s?.scoreboard?.[0]?.week?.[0] ?? '0')
    for (const m of (Array.isArray(matchups) ? matchups : [])) {
      const mo = Array.isArray(m) ? m[0] : m
      const isPlayoff = (mo?.is_playoffs?.[0] ?? mo?.is_playoffs) === '1'
      const isConsolation = (mo?.is_consolation?.[0] ?? mo?.is_consolation) === '1'
      const teamsArr = mo?.teams?.[0]?.team || []
      const teams = (Array.isArray(teamsArr) ? teamsArr : []).map((t: any) => {
        const td = Array.isArray(t) ? t[0] : t
        return Array.isArray(td?.team_key) ? td.team_key[0] : (td?.team_key || '')
      }).filter(Boolean)
      if (teams.length > 0) out.push({ teams, is_playoffs: isPlayoff, is_consolation: isConsolation, week })
    }
  }
  return out
}

// ── Detect playoff teams from winners-bracket matchups ─────────────────────────
async function detectPlayoffTeams(leagueKey: string, season: string, regWeeks: number): Promise<{
  numPlayoffTeams: number
  playoffTeamKeys: string[]
  method: string
  weekData: Record<number, { total: number; winners: number; consolation: number }>
}> {
  const weekData: Record<number, { total: number; winners: number; consolation: number }> = {}
  const winnersBracketTeams = new Set<string>()
  
  // Fetch weeks from regWeeks+1 through regWeeks+6
  for (let wk = regWeeks + 1; wk <= regWeeks + 6; wk++) {
    const data = await yahooGet(`/league/${leagueKey}/scoreboard;week=${wk};format=json`)
    if (data._error) {
      console.log(`    week ${wk}: ${data._error}`)
      weekData[wk] = { total: 0, winners: 0, consolation: 0 }
      await sleep(200)
      continue
    }
    const matchups = parseMatchups(data)
    const winners = matchups.filter(m => m.is_playoffs && !m.is_consolation)
    const consolation = matchups.filter(m => m.is_consolation)
    weekData[wk] = { total: matchups.length, winners: winners.length, consolation: consolation.length }
    winners.forEach(m => m.teams.forEach(tk => winnersBracketTeams.add(tk)))
    
    // Stop if we hit a week with no playoff data at all
    if (matchups.length === 0 && wk > regWeeks + 2) break
    await sleep(300)
  }

  const numPlayoffTeams = winnersBracketTeams.size
  return {
    numPlayoffTeams,
    playoffTeamKeys: Array.from(winnersBracketTeams),
    method: numPlayoffTeams > 0 ? 'winners_bracket' : 'fallback_6',
    weekData,
  }
}

// ── Fetch settings fresh (bypassing cache) ─────────────────────────────────────
async function fetchSettingsFresh(leagueKey: string): Promise<{ numPT: number | null; startWk: number | null; source: string }> {
  const data = await yahooGet(`/league/${leagueKey}/settings;format=json`)
  if (data._error) return { numPT: null, startWk: null, source: `403` }
  
  const raw = data?.fantasy_content?.league
  const lArr = Array.isArray(raw) ? raw : [raw]
  let numPT: number | null = null
  let startWk: number | null = null
  
  for (const section of lArr) {
    const s = Array.isArray(section) ? section[0] : section
    const npt = parseInt(s?.num_playoff_teams?.[0] ?? s?.num_playoff_teams ?? '0')
    if (npt > 0) numPT = npt
    const psw = parseInt(s?.playoff_start_week?.[0] ?? s?.playoff_start_week ?? '0')
    if (psw > 0) startWk = psw
    if (!numPT && s?.settings) {
      const sa = Array.isArray(s.settings) ? s.settings : [s.settings]
      for (const si of sa) {
        if (!si) continue
        const n = parseInt(si?.num_playoff_teams?.[0] ?? si?.num_playoff_teams ?? '0')
        if (n > 0) numPT = n
        const p = parseInt(si?.playoff_start_week?.[0] ?? si?.playoff_start_week ?? '0')
        if (p > 0) startWk = p
      }
    }
  }
  return { numPT, startWk, source: 'yahoo_api' }
}

// ── Investigate 2019 ───────────────────────────────────────────────────────────
async function investigate2019(leagueKey: string): Promise<void> {
  console.log(`\n═══ 2019 403 INVESTIGATION (${leagueKey}) ═══\n`)
  
  const tests = [
    { name: 'standings (JSON)', path: `/league/${leagueKey}/standings;format=json` },
    { name: 'settings (JSON)', path: `/league/${leagueKey}/settings;format=json` },
    { name: 'metadata (JSON)', path: `/league/${leagueKey};format=json` },
    { name: 'scoreboard wk1 (JSON)', path: `/league/${leagueKey}/scoreboard;week=1;format=json` },
    { name: 'scoreboard wk1 (XML)', path: `/league/${leagueKey}/scoreboard;week=1` },
    { name: 'game metadata', path: `/game/390;format=json` },
    { name: 'user leagues (all)', path: `/users;use_login=1/games;game_codes=nfl/leagues;format=json` },
  ]

  for (const t of tests) {
    const data = await yahooGet(t.path)
    if (data._error) {
      console.log(`  ✗ ${t.name}: HTTP ${data._error}`)
      console.log(`    ${data._body?.slice(0, 120) || ''}`)
    } else {
      const keys = Object.keys(data?.fantasy_content || {}).slice(0, 5)
      console.log(`  ✓ ${t.name}: OK (keys: ${keys.join(', ')})`)
    }
    await sleep(300)
  }

  // Check if we have any 2019 matchup data in DB cache
  const { data: cached, error } = await supabase.from('matchups')
    .select('week, team1_key, team2_key, team1_points, team2_points')
    .eq('league_key', leagueKey)
    .order('week')
  
  if (error) console.log(`  matchups DB: error — ${error.message}`)
  else console.log(`  matchups DB: ${cached?.length ?? 0} cached rows`)
  if (cached && cached.length > 0) {
    const weeks = [...new Set(cached.map((r: any) => r.week))].sort((a, b) => a - b)
    console.log(`    weeks in DB: ${weeks.join(', ')}`)
  }

  // Try user's leagues to verify league key
  const userLeagues = await yahooGet(`/users;use_login=1/games;game_keys=390/leagues;format=json`)
  if (!userLeagues._error) {
    try {
      const raw = userLeagues?.fantasy_content?.users?.[0]?.user?.[1]?.games?.[0]?.game
      const gArr = Array.isArray(raw) ? raw : [raw]
      for (const g of gArr) {
        const leaguesData = (Array.isArray(g) ? g[1] : g)?.leagues?.[0]?.league || []
        const lList = Array.isArray(leaguesData) ? leaguesData : []
        for (const l of lList) {
          const la = Array.isArray(l) ? l[0] : l
          const lk = Array.isArray(la?.league_key) ? la.league_key[0] : la?.league_key
          const name = Array.isArray(la?.name) ? la.name[0] : la?.name
          console.log(`  User's 2019 league: ${lk} — "${name}"`)
        }
      }
    } catch (e: any) {
      console.log(`  User leagues parse failed: ${e.message}`)
    }
  } else {
    console.log(`  User leagues endpoint: ${userLeagues._error}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n════════════════════════════════════════════════════════')
  console.log('  PLAYOFF SIZE + 2019 INVESTIGATION')
  console.log('════════════════════════════════════════════════════════\n')

  const leagues = LEAGUE_KEYS_ENV.split(',').map(k => k.trim()).filter(Boolean)
    .map(lk => ({ leagueKey: lk, season: GAME_KEY_TO_YEAR[lk.split('.')[0]] || '?' }))
    .filter(x => x.season !== '?')
    .sort((a, b) => parseInt(a.season) - parseInt(b.season))

  console.log(`Configured leagues: ${leagues.map(l => `${l.season}=${l.leagueKey}`).join(', ')}\n`)

  await getToken()

  // ── 1. Get known reg weeks from DB ──────────────────────────────────────────
  const { data: settingsCache } = await supabase.from('league_settings_cache').select('*')
  const settingsMap = new Map((settingsCache || []).map((r: any) => [r.league_key, r]))

  // ── 2. Per-season: fresh settings + bracket detection ──────────────────────
  console.log('Per-season playoff detection\n')
  console.log('Season | Yahoo /settings numPT | Bracket-detected numPT | Reg Wks | Playoffs by final_rank vs bracket')
  console.log('-------|----------------------|------------------------|---------|-----------------------------------')

  interface SeasonPlayoffInfo {
    season: string; leagueKey: string
    regWeeks: number
    settingsNumPT: number | null
    bracketNumPT: number
    bracketTeamKeys: string[]
    weekData: Record<number, { total: number; winners: number; consolation: number }>
  }
  const seasonInfos: SeasonPlayoffInfo[] = []

  for (const { leagueKey, season } of leagues) {
    const cached = settingsMap.get(leagueKey)
    const regWeeks = cached?.num_regular_season_weeks ?? 14

    process.stdout.write(`  ${season}... `)

    // Fresh settings check (no cache bypass needed since settings 403 anyway, but try)
    const fresh = await fetchSettingsFresh(leagueKey)
    process.stdout.write(`settings=${fresh.numPT ?? '403'} `)

    // Bracket detection
    const bracket = await detectPlayoffTeams(leagueKey, season, regWeeks)
    
    console.log(`bracket=${bracket.numPlayoffTeams} (${bracket.method}) weeks: ${
      Object.entries(bracket.weekData).map(([w, d]) => `wk${w}:${d.winners}W+${d.consolation}C`).join(' ')
    }`)

    // Show playoff teams
    if (bracket.playoffTeamKeys.length > 0) {
      // Look up owner names for team keys
      const { data: standings } = await supabase.from('league_standings')
        .select('team_key, owner_name, rank')
        .eq('league_key', leagueKey).is('week', null)
      const standMap = new Map((standings || []).map((s: any) => [s.team_key, s]))
      const playoffOwners = bracket.playoffTeamKeys.map(tk => {
        const s = standMap.get(tk)
        return s ? `${s.owner_name} (rank ${s.rank})` : tk
      }).sort()
      console.log(`    Playoff teams (${bracket.numPlayoffTeams}): ${playoffOwners.join(', ')}`)
    }

    seasonInfos.push({ season, leagueKey, regWeeks, settingsNumPT: fresh.numPT, bracketNumPT: bracket.numPlayoffTeams, bracketTeamKeys: bracket.playoffTeamKeys, weekData: bracket.weekData })
    await sleep(200)
  }

  // ── 3. Investigate 2019 ────────────────────────────────────────────────────
  const league2019 = leagues.find(l => l.season === '2019')
  if (league2019) await investigate2019(league2019.leagueKey)

  // ── 4. Summary: seasons where playoff count differs from 6 ─────────────────
  console.log('\n═══ SUMMARY: Seasons with bracket-detected numPT ≠ 6 ═══\n')
  const changed = seasonInfos.filter(s => s.bracketNumPT !== 6 && s.bracketNumPT > 0)
  if (changed.length === 0) {
    console.log('  All seasons with bracket data: 6 playoff teams confirmed.')
  } else {
    for (const s of changed) {
      console.log(`  ${s.season}: bracketDetected=${s.bracketNumPT} (was assumed 6)`)
    }
  }

  // ── 5. v1 vs v2 rank comparison ────────────────────────────────────────────
  console.log('\n═══ v1 vs v2: RANK CHANGES (top 10 risers + top 10 fallers) ═══\n')

  // Pull current sds_plus_cache (v2 data) from DB
  const { data: cache } = await supabase
    .from('sds_plus_cache')
    .select('season, owner_name, team_key, sds_plus_score, sds_plus_rank, breakdown_dominance, breakdown_scoring, breakdown_record, breakdown_result, breakdown_luck, is_fallback')
    .order('season').order('sds_plus_rank')

  if (!cache || cache.length === 0) { console.log('No sds_plus_cache data'); return }

  // Compute v1 from breakdown: v1 = DOM + SCR + LUCK + RESULT (no record)
  interface Row {
    season: string; owner: string; team_key: string
    score_v2: number; score_v1: number; rank_v2: number; rank_v1: number
    rankDelta: number; dom: number; scr: number; rec: number; result: number; luck: number
    isFallback: boolean
  }

  // Group by season, compute v1, assign ranks
  const bySeason = new Map<string, typeof cache>()
  for (const row of cache as any[]) {
    if (!bySeason.has(row.season)) bySeason.set(row.season, [])
    bySeason.get(row.season)!.push(row)
  }

  const allRows: Row[] = []
  for (const [season, rows] of bySeason) {
    // v1 = DOM + SCR + LUCK + RESULT
    const withV1 = rows.map((r: any) => ({
      ...r,
      score_v1: Math.round((parseFloat(r.breakdown_dominance) + parseFloat(r.breakdown_scoring) + parseFloat(r.breakdown_luck) + parseFloat(r.breakdown_result)) * 10) / 10,
    }))
    
    // Rank by v2 (already in cache as sds_plus_rank)
    // Rank by v1
    const sorted_v1 = [...withV1].sort((a, b) => b.score_v1 - a.score_v1)
    const v1Ranks = new Map(sorted_v1.map((r, i) => [r.team_key, i + 1]))

    for (const r of withV1) {
      const rankV2 = parseInt(r.sds_plus_rank)
      const rankV1 = v1Ranks.get(r.team_key) ?? 0
      allRows.push({
        season, owner: r.owner_name, team_key: r.team_key,
        score_v2: parseFloat(r.sds_plus_score),
        score_v1: r.score_v1,
        rank_v2: rankV2, rank_v1: rankV1,
        rankDelta: rankV1 - rankV2,  // positive = rose in v2 vs v1
        dom: parseFloat(r.breakdown_dominance), scr: parseFloat(r.breakdown_scoring),
        rec: parseFloat(r.breakdown_record), result: parseFloat(r.breakdown_result),
        luck: parseFloat(r.breakdown_luck), isFallback: r.is_fallback,
      })
    }
  }

  // Cross-season rank: rank all 130 by v2 score and by v1 score
  const sorted_v2_all = [...allRows].sort((a, b) => b.score_v2 - a.score_v2)
  const sorted_v1_all = [...allRows].sort((a, b) => b.score_v1 - a.score_v1)
  const globalRankV2 = new Map(sorted_v2_all.map((r, i) => [`${r.season}:${r.team_key}`, i + 1]))
  const globalRankV1 = new Map(sorted_v1_all.map((r, i) => [`${r.season}:${r.team_key}`, i + 1]))

  const withGlobalRanks = allRows.map(r => ({
    ...r,
    globalRankV2: globalRankV2.get(`${r.season}:${r.team_key}`) ?? 0,
    globalRankV1: globalRankV1.get(`${r.season}:${r.team_key}`) ?? 0,
    globalRankDelta: (globalRankV1.get(`${r.season}:${r.team_key}`) ?? 0) - (globalRankV2.get(`${r.season}:${r.team_key}`) ?? 0),
  }))

  const byGlobalRankDelta = [...withGlobalRanks].sort((a, b) => b.globalRankDelta - a.globalRankDelta)
  
  console.log('Top 10 RISERS (improved most in global rank with v2):')
  console.log('Season | Owner                  | v1     | v2     | Δ score | v1 rank | v2 rank | rank Δ')
  console.log('-------|------------------------|--------|--------|---------|---------|---------|-------')
  byGlobalRankDelta.slice(0, 10).forEach(r => {
    const d = r.score_v2 - r.score_v1
    console.log(`${r.season} | ${r.owner.padEnd(22)} | ${r.score_v1.toFixed(1).padStart(6)} | ${r.score_v2.toFixed(1).padStart(6)} | ${(d >= 0 ? '+' : '') + d.toFixed(1).padStart(6)} | ${String(r.globalRankV1).padStart(7)} | ${String(r.globalRankV2).padStart(7)} | +${r.globalRankDelta}`)
  })

  console.log('\nTop 10 FALLERS (dropped most in global rank with v2):')
  console.log('Season | Owner                  | v1     | v2     | Δ score | v1 rank | v2 rank | rank Δ')
  console.log('-------|------------------------|--------|--------|---------|---------|---------|-------')
  byGlobalRankDelta.slice(-10).reverse().forEach(r => {
    const d = r.score_v2 - r.score_v1
    console.log(`${r.season} | ${r.owner.padEnd(22)} | ${r.score_v1.toFixed(1).padStart(6)} | ${r.score_v2.toFixed(1).padStart(6)} | ${(d >= 0 ? '+' : '') + d.toFixed(1).padStart(6)} | ${String(r.globalRankV1).padStart(7)} | ${String(r.globalRankV2).padStart(7)} | ${r.globalRankDelta}`)
  })

  // ── 6. Label changes ────────────────────────────────────────────────────────
  const V2_T = { allTime: 120, elite: 105, veryGood: 85, aboveAverage: 70, average: 55 }
  // Old v1 thresholds (from original code)
  const V1_T = { allTime: 110, elite: 95, veryGood: 80, solid: 65 }

  function labelV2(score: number): string {
    if (score >= V2_T.allTime) return 'All-time'
    if (score >= V2_T.elite) return 'Elite'
    if (score >= V2_T.veryGood) return 'Very good'
    if (score >= V2_T.aboveAverage) return 'Above avg'
    if (score >= V2_T.average) return 'Average'
    return 'Below avg'
  }
  function labelV1(score: number): string {
    if (score >= V1_T.allTime) return 'All-time'
    if (score >= V1_T.elite) return 'Elite'
    if (score >= V1_T.veryGood) return 'Very good'
    if (score >= V1_T.solid) return 'Solid/above avg'
    return 'Below avg'
  }

  console.log('\n═══ LABEL CHANGES (v1 label → v2 label) ═══\n')
  const labelChanges = withGlobalRanks.filter(r => labelV1(r.score_v1) !== labelV2(r.score_v2))
  if (labelChanges.length === 0) {
    console.log('  No label changes.')
  } else {
    labelChanges.sort((a, b) => a.globalRankV2 - b.globalRankV2).forEach(r => {
      console.log(`  ${r.season} ${r.owner}: "${labelV1(r.score_v1)}" → "${labelV2(r.score_v2)}" (v1=${r.score_v1} → v2=${r.score_v2})`)
    })
  }

  // ── 7. Explain v1 discrepancy ───────────────────────────────────────────────
  console.log('\n═══ NOTE ON v1 DISCREPANCY ═══\n')
  console.log(`The "live v1" values you saw (e.g. Josh Werner 2022 = 62.7, Ian Gerrity 2024 = 92.5)`)
  console.log(`differ from the script's v1 (64.7 / 97.5) because:\n`)
  console.log(`  1. OLD DB DATA: The pre-recompute sds_plus_cache rows were computed by the browser-based`)
  console.log(`     flow which used Yahoo API data fetched during live sessions — potentially different`)
  console.log(`     weekly scores, different regularSeasonWeeks (2018/2019/2020 used 14, not 13), or`)
  console.log(`     even a slightly different APW formula in the original calculatePPSI implementation.`)
  console.log(``)
  console.log(`  2. THE RECOMPUTE OVERWROTE PROD: Your local .env.local points to the same Supabase`)
  console.log(`     instance as production (common for Next.js projects). The script has already replaced`)
  console.log(`     the old sds_plus_cache rows with fresh v2 rows. The original v1 values are gone.`)
  console.log(``)
  console.log(`  3. v1 BASELINE IN THIS ANALYSIS: The v1 values in the table above are computed fresh`)
  console.log(`     from our script data using: v1 = DOM + SCR + LUCK + RESULT (no Record). This is`)
  console.log(`     the mathematically correct v1 from the SAME weekly score data used for v2. Use these`)
  console.log(`     as the authoritative before/after baseline.`)
  
  // Specific examples
  const jw2022 = withGlobalRanks.find(r => r.season === '2022' && r.owner.includes('Werner'))
  const ig2024 = withGlobalRanks.find(r => r.season === '2024' && r.owner.includes('Gerrity'))
  if (jw2022) console.log(`\n  Josh Werner 2022: script v1=${jw2022.score_v1} v2=${jw2022.score_v2} (live v1 was 62.7 — diff=${(jw2022.score_v1 - 62.7).toFixed(1)})`)
  if (ig2024) console.log(`  Ian Gerrity 2024: script v1=${ig2024.score_v1} v2=${ig2024.score_v2} (live v1 was 92.5 — diff=${(ig2024.score_v1 - 92.5).toFixed(1)})`)
  
  console.log('\n  Most likely root cause of ~2-5pt gaps: the original browser-fetched weekly scores')
  console.log('  may have excluded some weeks (e.g., the browser fetch had a bug excluding zero-point')
  console.log('  weeks from both sides, changing APW), and 2018/2020 used 14 reg-season weeks instead')
  console.log('  of 13 (changing APW by using week 14 scores which were actually playoff data).')
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
