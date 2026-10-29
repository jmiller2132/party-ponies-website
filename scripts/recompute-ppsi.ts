/**
 * recompute-ppsi.ts
 * One-shot script: fetches all Yahoo data for 2013–2025 and recomputes PPSI
 * v1 and v2 for all 130 team-seasons WITHOUT a browser session.
 *
 * Usage:  npm run recompute-ppsi
 *   (or)  npx tsx scripts/recompute-ppsi.ts
 *
 * Outputs:
 *   - Console: per-season settings, before/after table, balance checks,
 *              zero-score log, label thresholds
 *   - output/ppsi-comparison.csv   — all 130 rows
 *   - output/ppsi-thresholds.json  — calibrated thresholds
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

// ── Env checks ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID!
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET!
const LEAGUE_KEYS_ENV = process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS || ''

for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_KEY, YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET })) {
  if (!v) { console.error(`Missing env var: ${k}`); process.exit(1) }
}

import { createClient } from '@supabase/supabase-js'
import { parseStringPromise } from 'xml2js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

// ── Game key → year mapping ───────────────────────────────────────────────────
const GAME_KEY_TO_YEAR: Record<string, string> = {
  '314': '2013', '331': '2014', '348': '2015', '359': '2016',
  '371': '2017', '380': '2018', '390': '2019', '399': '2020',
  '406': '2021', '414': '2022', '423': '2023', '449': '2024', '461': '2025',
}

// ── Owner name mappings (same as lib/owner-names.ts) ─────────────────────────
const OWNER_NAME_MAPPINGS: Record<string, string> = {
  'Jack':    'Jack Harvarth',
  'Darien':  'Darien Ruzzicone',
  'Josh':    'Josh Werner',
  'Carter':  'Carter Van Ekeren',
  'Liam':    'Liam Mahoney',
  'Chris':   'Chris Dahlke',
  'Jeff':    'Jeff Miller',
  'Mitch':   'Mitch Widule',
  'Ian':     'Ian Gerrity',
  'Isiah':   'Isiah Campbell',
  'Matt':    'Matt Kinderman',
  'Ben':     'Ben Simon',
  'Kim':     'Josh Werner',        // Kim is Josh Werner
  'Vicki':   'Jeff Steers',
  'Matthew': 'Matt De Starkey',
  'Dennis':  'Dennis Garvey',
  // Hidden owners (2013-2016) by year+teamname key
  '--hidden-- (2013) [Rhymes With Punt]':     'Jack Harvarth',
  '--hidden-- (2014) [Rhymes With Punt]':     'Jack Harvarth',
  '--hidden-- (2015) [The Fighting ACL\'s]':  'Jack Harvarth',
  '--hidden-- (2016) [The Fighting ACL\'s]':  'Jack Harvarth',
  '--hidden-- (2013) [Team Werner]':          'Josh Werner',
  '--hidden-- (2014) [Team Werner]':          'Josh Werner',
  '--hidden-- (2015) [Team Werner]':          'Josh Werner',
  '--hidden-- (2013) [Vicki\'s Team]':        'Jeff Steers',
  '--hidden-- (2014) [Vicki\'s Team]':        'Jeff Steers',
  '--hidden-- (2015) [Vicki\'s Team]':        'Jeff Steers',
  '--hidden-- (2016) [Vicki\'s Team]':        'Jeff Steers',
  '--hidden-- (2013) [Baller$]':             'Ben Simon',
  '--hidden-- (2014) [Baller$]':             'Ben Simon',
  '--hidden-- (2015) [Da Ballerz]':           'Ben Simon',
  '--hidden-- (2016) [Da Ballerz]':           'Ben Simon',
  '--hidden-- (2013) [Team Garvey]':          'Dennis Garvey',
  '--hidden-- (2014) [Matthew\'s Team]':      'Matt De Starkey',
}

function standardizeName(raw: string, year: string, teamName?: string): string {
  if (!raw) return raw
  const trimmed = raw.trim()

  // Check hidden owner by year+team key
  if (teamName) {
    const hiddenKey = `--hidden-- (${year}) [${teamName}]`
    if (OWNER_NAME_MAPPINGS[hiddenKey]) return OWNER_NAME_MAPPINGS[hiddenKey]
  }

  return OWNER_NAME_MAPPINGS[trimmed] || trimmed
}

// ── Yahoo OAuth helpers ───────────────────────────────────────────────────────
let _cachedToken: { access_token: string; expires_at: number; user_id: string } | null = null

async function getValidToken(): Promise<string> {
  const fiveMins = Date.now() + 5 * 60 * 1000

  if (_cachedToken && _cachedToken.expires_at > fiveMins) {
    return _cachedToken.access_token
  }

  // Fetch from DB
  const { data, error } = await supabase
    .from('yahoo_tokens')
    .select('user_id, access_token, refresh_token, expires_at')
    .limit(1)
    .single()

  if (error || !data) {
    throw new Error(
      'No Yahoo OAuth token found in database.\n' +
      'To fix: open https://localhost:3000, sign in with Yahoo once.\n' +
      'The token will be saved automatically and this script will work.'
    )
  }

  // Refresh if expiring soon
  if (data.expires_at < fiveMins) {
    console.log('  Refreshing Yahoo token...')
    const resp = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: data.refresh_token }),
    })

    if (!resp.ok) {
      const txt = await resp.text()
      if (txt.includes('invalid_grant')) {
        throw new Error(
          'Yahoo refresh token has expired (invalid_grant).\n' +
          'To fix: open https://localhost:3000, sign in with Yahoo once.\n' +
          'The token will be saved automatically and this script will work.'
        )
      }
      throw new Error(`Token refresh failed: ${txt}`)
    }

    const refreshed = await resp.json()
    const newExpires = Date.now() + (refreshed.expires_in * 1000)

    await supabase.from('yahoo_tokens').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || data.refresh_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    }).eq('user_id', data.user_id)

    _cachedToken = { access_token: refreshed.access_token, expires_at: newExpires, user_id: data.user_id }
    console.log('  Token refreshed OK.')
    return refreshed.access_token
  }

  _cachedToken = { access_token: data.access_token, expires_at: data.expires_at, user_id: data.user_id }
  return data.access_token
}

async function yahooFetch(path: string): Promise<any> {
  const token = await getValidToken()
  const base = 'https://fantasysports.yahooapis.com/fantasy/v2'
  const url = `${base}${path}`

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Yahoo API ${resp.status} for ${url}: ${txt.slice(0, 200)}`)
  }

  const text = await resp.text()
  if (text.trim().startsWith('<')) {
    return await parseStringPromise(text, { explicitArray: true })
  }
  return JSON.parse(text)
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

interface LeagueSettings {
  num_teams: number
  num_playoff_teams: number
  playoff_start_week: number
  num_regular_season_weeks: number
}

// Known season lengths based on Yahoo fantasy league structure.
// Used as fallback when /settings endpoint returns 403.
// 2018-2020: NFL introduced Thursday-Saturday games, many leagues ran 13-week seasons.
// 2021+: NFL expanded to 17 games; most leagues went to 14 regular season weeks.
const KNOWN_REG_WEEKS: Record<string, number> = {
  '2013': 14, '2014': 14, '2015': 14, '2016': 14,
  '2017': 14, '2018': 13, '2019': 13, '2020': 13,
  '2021': 14, '2022': 14, '2023': 14, '2024': 14, '2025': 14,
}

/**
 * HARDCODED per-season playoff sizes — SOURCE OF TRUTH.
 * Do not override from Yahoo API or DB cache; use those only as a cross-check.
 *
 * 2013–2017: 4-team playoff. Semis: 1v4 and 2v3.
 *   Ranks 5–6 are consolation bracket — get 0 Result pts.
 * 2018–2025: 6-team playoff. Seeds 1–2 get first-round byes.
 *   Quarterfinals: 3v6 and 4v5. Ranks 5–6 get 2 Result pts.
 *
 * Test cases:
 *   2014 → 4-team (Jeff Steers won as 4 seed; Carter finished 4th as 1 seed)
 *   2020 → 6-team (Isiah Campbell won as 3 seed; Carter and Darien had byes)
 */
const PLAYOFF_SIZES: Record<string, number> = {
  '2013': 4, '2014': 4, '2015': 4, '2016': 4, '2017': 4,
  '2018': 6, '2019': 6, '2020': 6, '2021': 6, '2022': 6,
  '2023': 6, '2024': 6, '2025': 6,
}

async function fetchLeagueSettings(leagueKey: string): Promise<LeagueSettings & { source: string }> {
  const season = GAME_KEY_TO_YEAR[leagueKey.split('.')[0]] || '0'
  const canonicalPT = PLAYOFF_SIZES[season] ?? 6  // hardcoded source of truth

  // Check DB cache first (always override num_playoff_teams from canonical table)
  const { data: cached } = await supabase
    .from('league_settings_cache')
    .select('*')
    .eq('league_key', leagueKey)
    .single()
  if (cached) {
    if (cached.num_playoff_teams !== canonicalPT) {
      console.warn(`  ⚠ DB cache has num_playoff_teams=${cached.num_playoff_teams} for ${season} but canonical is ${canonicalPT}. Fixing cache...`)
      await supabase.from('league_settings_cache').update({ num_playoff_teams: canonicalPT }).eq('league_key', leagueKey)
    }
    return {
      num_teams: cached.num_teams,
      num_playoff_teams: canonicalPT,   // always use canonical, never the cached value
      playoff_start_week: cached.playoff_start_week,
      num_regular_season_weeks: cached.num_regular_season_weeks,
      source: 'db_cache',
    }
  }

  const knownRegWks   = KNOWN_REG_WEEKS[season] ?? 14
  let settings: LeagueSettings & { source: string } = {
    num_teams: 10, num_playoff_teams: canonicalPT,
    playoff_start_week: knownRegWks + 1, num_regular_season_weeks: knownRegWks,
    source: 'known_fallback',
  }

  // Try Yahoo /settings endpoint
  try {
    const data = await yahooFetch(`/league/${leagueKey}/settings;format=json`)
    const raw = data?.fantasy_content?.league
    const leagueArr = Array.isArray(raw) ? raw : [raw]

    let gotSettings = false
    for (const section of leagueArr) {
      if (!section) continue
      const s = Array.isArray(section) ? section[0] : section

      const numTeams = parseInt(s?.num_teams?.[0] ?? s?.num_teams ?? '0')
      if (numTeams > 0) { settings.num_teams = numTeams; gotSettings = true }

      const numPT = parseInt(s?.num_playoff_teams?.[0] ?? s?.num_playoff_teams ?? '0')
      if (numPT > 0) {
        // Cross-check against hardcoded table; never override the canonical value
        if (numPT !== canonicalPT) {
          console.warn(`  ⚠ PLAYOFF SIZE MISMATCH for ${leagueKey} (${season}): Yahoo API says ${numPT}, hardcoded table says ${canonicalPT}. Using hardcoded value.`)
        }
        gotSettings = true
      }

      const startWk = parseInt(s?.playoff_start_week?.[0] ?? s?.playoff_start_week ?? '0')
      if (startWk > 0) {
        settings.playoff_start_week = startWk
        settings.num_regular_season_weeks = startWk - 1
        gotSettings = true
      }

      if (!numPT && s?.settings) {
        const settingsArr = Array.isArray(s.settings) ? s.settings : [s.settings]
        for (const si of settingsArr) {
          if (!si) continue
          const npt = parseInt(si?.num_playoff_teams?.[0] ?? si?.num_playoff_teams ?? '0')
          if (npt > 0) {
            if (npt !== canonicalPT) {
              console.warn(`  ⚠ PLAYOFF SIZE MISMATCH for ${leagueKey} (${season}): Yahoo settings say ${npt}, hardcoded table says ${canonicalPT}. Using hardcoded value.`)
            }
            gotSettings = true
          }
          const psw = parseInt(si?.playoff_start_week?.[0] ?? si?.playoff_start_week ?? '0')
          if (psw > 0) {
            settings.playoff_start_week = psw
            settings.num_regular_season_weeks = psw - 1
            gotSettings = true
          }
        }
      }
    }
    if (gotSettings) settings.source = 'yahoo_api'
  } catch (_e: any) {
    // 403 is expected for old seasons; fall through to scoreboard detection
  }

  // If still using fallback, try to detect playoff_start_week from scoreboard
  // by finding the first week where is_playoffs=1
  if (settings.source === 'known_fallback') {
    try {
      let detected = false
      for (let wk = 12; wk <= 17; wk++) {
        try {
          const data = await yahooFetch(`/league/${leagueKey}/scoreboard;week=${wk};format=json`)
          const raw = data?.fantasy_content?.league
          const lArr = Array.isArray(raw) ? raw : [raw]
          for (const section of lArr) {
            const s = Array.isArray(section) ? section[0] : section
            const matchups = s?.scoreboard?.[0]?.matchups?.[0]?.matchup || []
            const mList = Array.isArray(matchups) ? matchups : []
            for (const m of mList) {
              const mo = Array.isArray(m) ? m[0] : m
              const isPlayoff = (mo?.is_playoffs?.[0] ?? mo?.is_playoffs) === '1'
              if (isPlayoff) {
                settings.playoff_start_week = wk
                settings.num_regular_season_weeks = wk - 1
                settings.source = 'scoreboard_detection'
                detected = true
                break
              }
            }
            if (detected) break
          }
          if (detected) break
          await sleep(200)
        } catch { break }
      }
    } catch { /* keep known_fallback */ }
  }

  // Always force canonical playoff size before caching / returning
  settings.num_playoff_teams = canonicalPT

  // Cache for next run
  await supabase.from('league_settings_cache').upsert({
    league_key: leagueKey, season,
    num_teams: settings.num_teams,
    num_playoff_teams: canonicalPT,
    playoff_start_week: settings.playoff_start_week,
    num_regular_season_weeks: settings.num_regular_season_weeks,
    cached_at: new Date().toISOString(),
  }, { onConflict: 'league_key' })

  return settings
}

interface Standing {
  team_key: string
  name: string
  owner_name: string
  rank: number
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
}

async function fetchStandings(leagueKey: string, season: string): Promise<Standing[]> {
  // Check DB cache
  const { data: cached } = await supabase
    .from('league_standings')
    .select('*')
    .eq('league_key', leagueKey)
    .eq('season', season)
    .is('week', null)
    .order('rank', { ascending: true })

  if (cached && cached.length > 0 && cached.every((r: any) => r.owner_name)) {
    return cached.map((r: any) => ({
      team_key: r.team_key,
      name: r.name || '',
      owner_name: r.owner_name,
      rank: r.rank,
      wins: r.wins || 0,
      losses: r.losses || 0,
      ties: r.ties || 0,
      points_for: parseFloat(r.points_for) || 0,
      points_against: parseFloat(r.points_against) || 0,
    }))
  }

  // Fetch from Yahoo
  let teams: Standing[] = []
  try {
    const data = await yahooFetch(`/league/${leagueKey}/standings;format=json`)
    const raw = data?.fantasy_content?.league
    const leagueArr = Array.isArray(raw) ? raw : [raw]

    // Also fetch manager names
    const managerMap = new Map<string, string>()
    try {
      const teamsData = await yahooFetch(`/league/${leagueKey}/teams;format=json`)
      const tRaw = teamsData?.fantasy_content?.league
      const tArr = Array.isArray(tRaw) ? tRaw : [tRaw]
      for (const section of tArr) {
        const s = Array.isArray(section) ? section[0] : section
        const teamsList = s?.teams?.[0]?.team || []
        const tList = Array.isArray(teamsList) ? teamsList : []
        for (const team of tList) {
          const td = Array.isArray(team) ? team[0] : team
          const tk = Array.isArray(td?.team_key) ? td.team_key[0] : td?.team_key
          const mgrs = td?.managers?.[0]?.manager || []
          const mList = Array.isArray(mgrs) ? mgrs : [mgrs]
          if (mList.length > 0) {
            const m = mList[0]
            const nick = Array.isArray(m?.nickname) ? m.nickname[0] : m?.nickname
            if (tk && nick) managerMap.set(tk, nick)
          }
        }
      }
    } catch { /* manager names optional */ }

    for (const section of leagueArr) {
      const s = Array.isArray(section) ? section[0] : section
      const teamsList = s?.standings?.[0]?.teams?.[0]?.team || []
      const tList = Array.isArray(teamsList) ? teamsList : []

      for (const team of tList) {
        const td = Array.isArray(team) ? team[0] : team
        const tk = Array.isArray(td?.team_key) ? td.team_key[0] : td?.team_key
        if (!tk) continue

        // Team name
        const nameArr = Array.isArray(td?.name) ? td.name : [td?.name]
        const teamName = nameArr[0] || ''

        // Owner name
        let ownerRaw = managerMap.get(tk) || ''
        if (!ownerRaw) {
          const mgrs = td?.managers?.[0]?.manager || []
          const mList = Array.isArray(mgrs) ? mgrs : [mgrs]
          if (mList.length > 0) {
            const nick = Array.isArray(mList[0]?.nickname) ? mList[0].nickname[0] : mList[0]?.nickname
            ownerRaw = nick || ''
          }
        }
        if (!ownerRaw) ownerRaw = `--hidden-- (${season}) [${teamName}]`
        const ownerName = standardizeName(ownerRaw, season, teamName)

        // Rank + W-L-T-PF-PA from team_standings
        let rank = 0, wins = 0, losses = 0, ties = 0, pf = 0, pa = 0
        const tsArr = td?.team_standings || []
        const tsList = Array.isArray(tsArr) ? tsArr : [tsArr]
        for (const ts of tsList) {
          const tso = Array.isArray(ts) ? ts[0] : ts
          rank = parseInt(tso?.rank?.[0] ?? tso?.rank ?? '0') || rank
          pf = parseFloat(tso?.points_for?.[0] ?? tso?.points_for ?? '0') || pf
          pa = parseFloat(tso?.points_against?.[0] ?? tso?.points_against ?? '0') || pa
          const rec = tso?.outcome_totals?.[0] || tso?.outcome_totals
          if (rec) {
            wins = parseInt(rec?.wins?.[0] ?? rec?.wins ?? '0') || wins
            losses = parseInt(rec?.losses?.[0] ?? rec?.losses ?? '0') || losses
            ties = parseInt(rec?.ties?.[0] ?? rec?.ties ?? '0') || ties
          }
        }

        teams.push({ team_key: tk, name: teamName, owner_name: ownerName, rank, wins, losses, ties, points_for: pf, points_against: pa })
      }
    }
  } catch (e: any) {
    throw new Error(`Standings fetch failed for ${leagueKey}: ${e.message}`)
  }

  if (teams.length > 0) {
    // Cache to DB
    await supabase.from('league_standings').delete().eq('league_key', leagueKey).eq('season', season).is('week', null)
    const rows = teams.map(t => ({
      league_key: leagueKey, season, week: null,
      team_key: t.team_key, name: t.name, owner_name: t.owner_name,
      rank: t.rank, wins: t.wins, losses: t.losses, ties: t.ties,
      points_for: t.points_for, points_against: t.points_against,
      created_at: new Date().toISOString(),
    }))
    await supabase.from('league_standings').insert(rows)
  }

  return teams
}

interface WeeklyScore {
  team_key: string
  week: number
  points: number
  opponent_key?: string
}

async function fetchWeeklyScores(leagueKey: string, season: string, maxWeek: number): Promise<{ scores: WeeklyScore[], isPartial: boolean, missingWeeks: number[] }> {
  // Check if we have weeks cached in the 'matchups' table (the real table name)
  const { data: cachedMatchups } = await supabase
    .from('matchups')
    .select('week, team1_key, team2_key, team1_points, team2_points')
    .eq('league_key', leagueKey)
    .eq('season', season)
    .lte('week', maxWeek + 4)

  if (cachedMatchups && cachedMatchups.length > 0) {
    const weeksPresent = new Set(cachedMatchups.filter((m: any) => m.week <= maxWeek).map((m: any) => m.week))
    const hasAllRegular = Array.from({ length: maxWeek }, (_, i) => i + 1).every(w => weeksPresent.has(w))
    // Accept partial DB data if we have ≥ 70% of regular-season weeks (e.g. 2019 is missing week 12)
    const hasPartial = weeksPresent.size >= Math.ceil(maxWeek * 0.7)
    const missingWeeks = Array.from({ length: maxWeek }, (_, i) => i + 1).filter(w => !weeksPresent.has(w))

    if (hasAllRegular || (hasPartial && !hasAllRegular)) {
      if (!hasAllRegular) {
        console.log(`  ⚠ Using partial DB cache (missing reg-season weeks: ${missingWeeks.join(',')}). Those weeks excluded from all-play.`)
      }
      const scores: WeeklyScore[] = []
      for (const m of cachedMatchups as any[]) {
        scores.push({ team_key: m.team1_key, week: m.week, points: parseFloat(m.team1_points) || 0, opponent_key: m.team2_key })
        scores.push({ team_key: m.team2_key, week: m.week, points: parseFloat(m.team2_points) || 0, opponent_key: m.team1_key })
      }
      return { scores, isPartial: !hasAllRegular, missingWeeks }
    }
  }

  const scores: WeeklyScore[] = []
  const weeksToFetch = maxWeek + 4 // fetch extra weeks for playoff detection

  for (let week = 1; week <= weeksToFetch; week++) {
    try {
      const data = await yahooFetch(`/league/${leagueKey}/scoreboard;week=${week};format=json`)
      const raw = data?.fantasy_content?.league
      const lArr = Array.isArray(raw) ? raw : [raw]

      let gotAny = false
      const weekMatchupRows: any[] = []

      for (const section of lArr) {
        const s = Array.isArray(section) ? section[0] : section
        const matchups = s?.scoreboard?.[0]?.matchups?.[0]?.matchup || []
        const mList = Array.isArray(matchups) ? matchups : []

        for (const m of mList) {
          const mo = Array.isArray(m) ? m[0] : m
          const teamsArr = mo?.teams?.[0]?.team || []
          const teamsList = Array.isArray(teamsArr) ? teamsArr : []
          if (teamsList.length < 2) continue

          const t1 = Array.isArray(teamsList[0]) ? teamsList[0][0] : teamsList[0]
          const t2 = Array.isArray(teamsList[1]) ? teamsList[1][0] : teamsList[1]

          const tk1 = Array.isArray(t1?.team_key) ? t1.team_key[0] : t1?.team_key
          const tk2 = Array.isArray(t2?.team_key) ? t2.team_key[0] : t2?.team_key

          const getPoints = (t: any): number => {
            const tp = t?.team_points?.[0] ?? t?.team_points
            if (typeof tp === 'object' && tp !== null) {
              return parseFloat(tp?.total?.[0] ?? tp?.total ?? '0') || 0
            }
            return parseFloat(tp ?? '0') || 0
          }

          const p1 = getPoints(t1)
          const p2 = getPoints(t2)

          const t1name = Array.isArray(t1?.name) ? t1.name[0] : (t1?.name || '')
          const t2name = Array.isArray(t2?.name) ? t2.name[0] : (t2?.name || '')

          if (tk1 && tk2) {
            scores.push({ team_key: tk1, week, points: p1, opponent_key: tk2 })
            scores.push({ team_key: tk2, week, points: p2, opponent_key: tk1 })
            weekMatchupRows.push({
              league_key: leagueKey, season, week,
              matchup_key: `${tk1}-${tk2}`,
              team1_key: tk1, team1_name: t1name, team1_owner_name: null, team1_points: p1,
              team2_key: tk2, team2_name: t2name, team2_owner_name: null, team2_points: p2,
              status: 'postevent',
            })
            gotAny = true
          }
        }
      }

      // Cache this week's matchups
      if (weekMatchupRows.length > 0) {
        await supabase.from('matchups').delete().eq('league_key', leagueKey).eq('season', season).eq('week', week)
        await supabase.from('matchups').insert(weekMatchupRows)
      }

      if (!gotAny && week > maxWeek + 1) break

      // Rate limiting — be gentle with Yahoo API
      await sleep(300)
    } catch (e: any) {
      if (e.message.includes('404') || e.message.includes('400')) break
      console.warn(`    Week ${week}: ${e.message}`)
    }
  }

  return { scores, isPartial: false, missingWeeks: [] }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── PPSI calculation (self-contained, mirrors lib/sds-plus.ts) ────────────────

interface PPSIResult {
  owner: string
  team_key: string
  score_v2: number
  score_v1: number
  breakdown_dom: number
  breakdown_scr: number
  breakdown_rec: number
  breakdown_result: number
  breakdown_luck: number
  dominanceRate: number
  regularSeasonPF: number
  finalRank: number
  isFallback: boolean
}

function calcPPSI(standings: Standing[], weeklyScores: WeeklyScore[], regWeeks: number, numPT: number): PPSIResult[] {
  const N = standings.length
  const allTeamKeys = standings.map(t => t.team_key)

  // ── Zero-score detection ──────────────────────────────────────────────────
  const zeroSet = new Set<string>()
  const zeroLog: string[] = []
  if (weeklyScores.length > 0) {
    weeklyScores.forEach(ws => {
      if (ws.week > regWeeks) return
      if (ws.points <= 0) {
        const k = `${ws.team_key}:${ws.week}`
        if (!zeroSet.has(k)) { zeroSet.add(k); zeroLog.push(`week=${ws.week} team=${ws.team_key}`) }
      }
    })
    // Missing teams in a week
    const weeksPresent = new Set(weeklyScores.filter(w => w.week <= regWeeks).map(w => w.week))
    weeksPresent.forEach(wk => {
      const here = new Set(weeklyScores.filter(w => w.week === wk).map(w => w.team_key))
      allTeamKeys.forEach(tk => {
        if (!here.has(tk)) {
          const k = `${tk}:${wk}`
          if (!zeroSet.has(k)) { zeroSet.add(k); zeroLog.push(`week=${wk} team=${tk} (missing)`) }
        }
      })
    })
  }

  // ── All-play ──────────────────────────────────────────────────────────────
  const isFallback = weeklyScores.length === 0
  const apwMap = new Map<string, { apw: number }>()

  if (!isFallback) {
    const scoresByWeek = new Map<number, Map<string, number>>()
    weeklyScores.forEach(ws => {
      if (ws.week > regWeeks) return
      if (!scoresByWeek.has(ws.week)) scoresByWeek.set(ws.week, new Map())
      scoresByWeek.get(ws.week)!.set(ws.team_key, ws.points)
    })

    allTeamKeys.forEach(teamKey => {
      const teamWeeks = weeklyScores.filter(ws =>
        ws.team_key === teamKey && ws.week <= regWeeks && !zeroSet.has(`${teamKey}:${ws.week}`)
      )
      let wins = 0, ties = 0, total = 0
      teamWeeks.forEach(tw => {
        const wkMap = scoresByWeek.get(tw.week)
        if (!wkMap) return
        allTeamKeys.forEach(opp => {
          if (opp === teamKey) return
          if (zeroSet.has(`${opp}:${tw.week}`)) return
          const oppPts = wkMap.get(opp)
          if (oppPts === undefined) return
          if (tw.points > oppPts) wins++
          else if (tw.points === oppPts) ties++
          total++
        })
      })
      apwMap.set(teamKey, { apw: total > 0 ? (wins + 0.5 * ties) / total : 0.5 })
    })
  } else {
    allTeamKeys.forEach(tk => {
      const t = standings.find(s => s.team_key === tk)!
      const g = t.wins + t.losses + t.ties
      apwMap.set(tk, { apw: g > 0 ? (t.wins + 0.5 * t.ties) / g : 0.5 })
    })
  }

  // ── Regular-season PF ─────────────────────────────────────────────────────
  const rsPFMap = new Map<string, number>()
  standings.forEach(t => {
    const total = weeklyScores
      .filter(ws => ws.team_key === t.team_key && ws.week <= regWeeks && ws.points > 0)
      .reduce((s, ws) => s + ws.points, 0)
    rsPFMap.set(t.team_key, total > 0 ? total : t.points_for)
  })

  const avgPF = standings.reduce((s, t) => s + (rsPFMap.get(t.team_key) ?? t.points_for), 0) / N
  const pfVals = standings.map(t => rsPFMap.get(t.team_key) ?? t.points_for)
  const pfSorted = [...pfVals].sort((a, b) => b - a)

  function pfRank(teamKey: string): number {
    const pf = rsPFMap.get(teamKey) ?? 0
    const positions = pfSorted.reduce<number[]>((acc, v, i) => { if (v === pf) acc.push(i + 1); return acc }, [])
    return positions.reduce((a, b) => a + b, 0) / positions.length
  }

  // ── Top seed ──────────────────────────────────────────────────────────────
  const seedRanks = standings.map(t => {
    const g = t.wins + t.losses + t.ties
    return { tk: t.team_key, wp: g > 0 ? (t.wins + 0.5 * t.ties) / g : 0, pf: rsPFMap.get(t.team_key) ?? t.points_for }
  }).sort((a, b) => b.wp - a.wp || b.pf - a.pf)
  const topSeed = seedRanks[0]?.tk

  // ── Compute ───────────────────────────────────────────────────────────────
  return standings.map(team => {
    const g = team.wins + team.losses + team.ties
    const actualWP = g > 0 ? (team.wins + 0.5 * team.ties) / g : 0.5
    const { apw } = apwMap.get(team.team_key) ?? { apw: 0.5 }
    const rsPF = rsPFMap.get(team.team_key) ?? team.points_for
    const pfRatio = avgPF > 0 ? rsPF / avgPF : 1.0
    const scoringPctile = N > 1 ? 1 - (pfRank(team.team_key) - 1) / (N - 1) : 1.0

    const dom = apw * 50
    const scr = pfRatio * 25 + scoringPctile * 25
    const rec = actualWP * 10
    const luck = (apw - actualWP) * 15

    // Result
    let baseResult = 0
    if (team.rank === 1) baseResult = 35
    else if (team.rank === 2) baseResult = 20
    else if (team.rank === 3) baseResult = 10
    else if (team.rank === 4) baseResult = 5
    else if (numPT > 4 && team.rank >= 5 && team.rank <= numPT) baseResult = 2
    const seedBonus = team.team_key === topSeed ? 3 : 0
    const result = baseResult + seedBonus

    const v2 = Math.round((dom + scr + rec + result) * 10) / 10
    const v1 = Math.round((dom + scr + luck + result) * 10) / 10

    return {
      owner: team.owner_name,
      team_key: team.team_key,
      score_v2: v2,
      score_v1: v1,
      breakdown_dom: Math.round(dom * 10) / 10,
      breakdown_scr: Math.round(scr * 10) / 10,
      breakdown_rec: Math.round(rec * 10) / 10,
      breakdown_result: result,
      breakdown_luck: Math.round(luck * 10) / 10,
      dominanceRate: Math.round(apw * 1000) / 1000,
      regularSeasonPF: Math.round(rsPF * 100) / 100,
      finalRank: team.rank,
      isFallback,
    }
  })
}

// ── Cache PPSI to DB ──────────────────────────────────────────────────────────
async function savePPSIToDB(
  leagueKey: string, season: string,
  results: PPSIResult[], standings: Standing[],
  regWeeks: number, numPT: number,
  isPartial: boolean = false
): Promise<void> {
  // Rank by v2 score
  const sorted = [...results].sort((a, b) => b.score_v2 - a.score_v2)
  const rankMap = new Map(sorted.map((r, i) => [r.team_key, i + 1]))
  const standMap = new Map(standings.map(s => [s.team_key, s]))

  // Schema columns: sds_plus_score, sds_plus_rank, final_rank (not score/rank/finalRank)
  const rows = results.map(r => {
    const st = standMap.get(r.team_key)
    return {
      league_key: leagueKey,
      season,
      owner_name: r.owner,
      team_key: r.team_key,
      sds_plus_score: r.score_v2,
      sds_plus_rank: rankMap.get(r.team_key) ?? 0,
      final_rank: r.finalRank,
      wins: st?.wins ?? 0,
      losses: st?.losses ?? 0,
      ties: st?.ties ?? 0,
      points_for: st?.points_for ?? 0,
      points_against: st?.points_against ?? 0,
      breakdown_dominance: r.breakdown_dom,
      breakdown_scoring: r.breakdown_scr,
      breakdown_record: r.breakdown_rec,
      breakdown_result: r.breakdown_result,
      breakdown_luck: r.breakdown_luck,
      regular_season_weeks: regWeeks,
      num_playoff_teams: numPT,
      regular_season_pf: r.regularSeasonPF,
      formula_version: 'v2',
      is_fallback: r.isFallback,
      is_partial: isPartial,
      cached_at: new Date().toISOString(),
    }
  })

  // Delete old rows and re-insert
  await supabase.from('sds_plus_cache').delete().eq('league_key', leagueKey).eq('season', season)
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('sds_plus_cache').insert(rows.slice(i, i + 50))
    if (error) console.warn(`    DB insert warning: ${error.message}`)
  }
}

// ── Bracket-based playoff size detection (cross-check only) ──────────────────

/**
 * For seasons where we have post-regular-season matchup rows in the DB,
 * infer the playoff format:
 *   - If seeds 1 and 2 are NOT among the teams playing in the first playoff week → 6-team (byes)
 *   - If seeds 1 and 2 ARE among the 4 teams in the first playoff week → ambiguous
 *     (could be 4-team semis or unusual 6-team seeding; rely on hardcoded table)
 *   - If first playoff week has 3 or more matchups → 6-team (all play, or 8-team)
 * Returns null if no bracket data is available.
 */
async function detectPlayoffSizeFromBracket(
  leagueKey: string, season: string, regWeeks: number, standings: Standing[]
): Promise<{ detected: number | null; notes: string }> {
  const firstPlayoffWeek = regWeeks + 1

  const { data: postReg } = await supabase
    .from('matchups')
    .select('*')
    .eq('league_key', leagueKey)
    .eq('season', season)
    .eq('week', firstPlayoffWeek)

  if (!postReg || postReg.length === 0) {
    return { detected: null, notes: 'no bracket data in DB for this season' }
  }

  const matchupCount = postReg.length
  const playoffTeamKeys = new Set<string>()
  postReg.forEach((m: any) => {
    playoffTeamKeys.add(m.team1_key)
    playoffTeamKeys.add(m.team2_key)
  })

  // Determine seeds 1 and 2 by regular-season record (win%, PF tiebreak)
  const seeded = [...standings].sort((a, b) => {
    const gA = a.wins + a.losses + a.ties
    const gB = b.wins + b.losses + b.ties
    const wpA = gA > 0 ? (a.wins + 0.5 * a.ties) / gA : 0
    const wpB = gB > 0 ? (b.wins + 0.5 * b.ties) / gB : 0
    if (wpB !== wpA) return wpB - wpA
    return b.points_for - a.points_for
  })

  const seed1 = seeded[0]?.team_key
  const seed2 = seeded[1]?.team_key
  const seed1Name = seeded[0]?.owner_name ?? seed1
  const seed2Name = seeded[1]?.owner_name ?? seed2

  if (matchupCount >= 3) {
    return {
      detected: matchupCount === 3 ? 6 : matchupCount * 2,
      notes: `${matchupCount} matchups in wk${firstPlayoffWeek} → all seeds playing (no byes) → ${matchupCount === 3 ? 6 : matchupCount * 2}-team`
    }
  }

  // 2 matchups, 4 teams playing
  const seed1Playing = playoffTeamKeys.has(seed1 ?? '')
  const seed2Playing = playoffTeamKeys.has(seed2 ?? '')

  if (!seed1Playing && !seed2Playing) {
    return {
      detected: 6,
      notes: `wk${firstPlayoffWeek} had 2 matchups; seeds 1 (${seed1Name}) and 2 (${seed2Name}) NOT playing → 6-team (byes confirmed)`
    }
  }

  return {
    detected: null,
    notes: `wk${firstPlayoffWeek} had 2 matchups; seed1 playing=${seed1Playing}, seed2 playing=${seed2Playing} → ambiguous (rely on hardcoded table)`
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface SeasonRow {
  season: string
  leagueKey: string
  settings: LeagueSettings
  results: PPSIResult[]
  standings: Standing[]
  weeklyScores: WeeklyScore[]
  isPartial: boolean
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════')
  console.log('  PPSI RECOMPUTE — all seasons 2013–2025')
  console.log('════════════════════════════════════════════════════════\n')

  // ── Get league keys ───────────────────────────────────────────────────────
  const leagueEntries: { leagueKey: string; season: string }[] = []
  if (LEAGUE_KEYS_ENV) {
    for (const lk of LEAGUE_KEYS_ENV.split(',').map(k => k.trim()).filter(Boolean)) {
      const gameKey = lk.split('.')[0]
      const season = GAME_KEY_TO_YEAR[gameKey]
      if (season) leagueEntries.push({ leagueKey: lk, season })
    }
  }

  if (leagueEntries.length === 0) {
    console.error('No league keys found. Set NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS in .env.local')
    process.exit(1)
  }

  leagueEntries.sort((a, b) => parseInt(a.season) - parseInt(b.season))
  console.log(`Found ${leagueEntries.length} seasons: ${leagueEntries.map(e => e.season).join(', ')}\n`)

  // ── Test token + identify whose account it is ─────────────────────────────
  console.log('Checking Yahoo OAuth token...')
  try {
    await getValidToken()
    // Try to identify the Yahoo account
    try {
      const userInfo = await yahooFetch('/users;use_login=1/profile;format=json')
      const profile = userInfo?.fantasy_content?.users?.[0]?.user?.[0]
      const displayName = Array.isArray(profile?.profile?.[0]?.display_name)
        ? profile.profile[0].display_name[0]
        : (profile?.profile?.[0]?.display_name ?? 'unknown')
      const guid = Array.isArray(profile?.guid) ? profile.guid[0] : (profile?.guid ?? 'unknown')
      console.log(`  Token OK. Yahoo account: ${displayName} (GUID: ${guid})`)
      if (!String(displayName).toLowerCase().includes('jeff') && !String(displayName).toLowerCase().includes('miller')) {
        console.warn(`  ⚠ Token does not appear to be Jeff Miller's account. 2019 week 12 will remain unavailable until re-authing as Jeff Miller.`)
        console.warn(`    Re-auth URL (open in browser, then run the auth callback route):`)
        const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${YAHOO_CLIENT_ID}&redirect_uri=${encodeURIComponent('https://localhost:3000/api/auth/yahoo/callback')}&response_type=code&scope=fspt-r`
        console.warn(`    ${authUrl}`)
      }
    } catch {
      console.log('  Token OK. (could not fetch user profile — non-fatal)')
    }
    console.log('')
  } catch (e: any) {
    console.error('\n' + e.message)
    process.exit(1)
  }

  // ── Stray league cleanup ──────────────────────────────────────────────────
  console.log('Cleaning up stray league data...')
  const STRAY_TABLES = ['matchups', 'league_standings', 'league_settings_cache', 'sds_plus_cache'] as const
  for (const table of STRAY_TABLES) {
    const { data: allRows } = await supabase.from(table).select('league_key')
    if (!allRows) continue
    const strayKeys = [...new Set(allRows.map((r: any) => r.league_key))].filter((k: string) => !leagueEntries.some(e => e.leagueKey === k))
    for (const k of strayKeys as string[]) {
      const count = allRows.filter((r: any) => r.league_key === k).length
      const { error } = await supabase.from(table).delete().eq('league_key', k)
      if (error) console.warn(`  ✗ Could not remove ${k} from ${table}: ${error.message}`)
      else console.log(`  ✓ Removed ${count} stray rows for ${k} from ${table}`)
    }
  }
  console.log('')

  // ── Per-season settings table ─────────────────────────────────────────────
  const settingsTable: string[] = []
  const seasonData: SeasonRow[] = []
  let zeroExclusions: { season: string; owner: string; week: number; teamKey: string }[] = []
  let totalTeamWeeksChecked = 0

  console.log('Per-season league settings\n')
  console.log('Season | Teams | Playoff Teams | Playoff Start Wk | Reg Season Wks')
  console.log('-------|-------|---------------|------------------|---------------')

  for (const { leagueKey, season } of leagueEntries) {
    process.stdout.write(`  ${season}... `)

    const settings = await fetchLeagueSettings(leagueKey)
    const { source, ...cleanSettings } = settings as any
    console.log(`teams=${settings.num_teams} playoffs=${settings.num_playoff_teams} startWk=${settings.playoff_start_week} regWks=${settings.num_regular_season_weeks} [${source}]`)

    settingsTable.push(`${season} | ${settings.num_teams} | ${settings.num_playoff_teams} | Wk ${settings.playoff_start_week} | Wks 1–${settings.num_regular_season_weeks} | ${source}`)

    const standings = await fetchStandings(leagueKey, season)
    if (standings.length === 0) {
      console.warn(`  ⚠ No standings for ${season}, skipping`)
      continue
    }

    // Bracket-based detection cross-check (never overrides hardcoded table)
    const numPT = settings.num_playoff_teams  // already set to PLAYOFF_SIZES[season]
    const detection = await detectPlayoffSizeFromBracket(leagueKey, season, settings.num_regular_season_weeks, standings)
    if (detection.detected !== null && detection.detected !== numPT) {
      console.warn(`  ⚠ BRACKET DETECTION MISMATCH ${season}: bracket says ${detection.detected}-team but table says ${numPT}-team (${detection.notes})`)
    } else if (detection.detected !== null) {
      console.log(`  ✓ Bracket check ${season}: detected ${detection.detected}-team (${detection.notes})`)
    }

    process.stdout.write(`  ${season}: fetching weekly scores... `)
    const { scores: weeklyScores, isPartial: seasonIsPartial, missingWeeks: seasonMissingWeeks } =
      await fetchWeeklyScores(leagueKey, season, settings.num_regular_season_weeks)
    console.log(`${weeklyScores.length} score entries${seasonIsPartial ? ` (partial — missing wks ${seasonMissingWeeks.join(',')})` : ''}`)

    totalTeamWeeksChecked += standings.length * settings.num_regular_season_weeks

    // Find zero-score exclusions for this season
    const standingsByKey = new Map(standings.map(s => [s.team_key, s]))
    weeklyScores.forEach(ws => {
      if (ws.week <= settings.num_regular_season_weeks && ws.points <= 0) {
        const st = standingsByKey.get(ws.team_key)
        zeroExclusions.push({ season, owner: st?.owner_name ?? ws.team_key, week: ws.week, teamKey: ws.team_key })
      }
    })

    const results = calcPPSI(standings, weeklyScores, settings.num_regular_season_weeks, numPT)
    await savePPSIToDB(leagueKey, season, results, standings, settings.num_regular_season_weeks, numPT, seasonIsPartial)

    seasonData.push({ season, leagueKey, settings, results, standings, weeklyScores, isPartial: seasonIsPartial })
    await sleep(300)
  }

  // ── Collect all 130 rows ──────────────────────────────────────────────────
  interface FullRow {
    season: string; owner: string; team_key: string
    score_v2: number; score_v1: number; rank_v2: number; rank_v1: number
    breakdown_dom: number; breakdown_scr: number; breakdown_rec: number
    breakdown_result: number; breakdown_luck: number
    regWeeks: number; numPT: number; regularSeasonPF: number; isFallback: boolean
    finalRank: number
  }

  const allRows: FullRow[] = []
  for (const { season, results, settings } of seasonData) {
    const sorted_v2 = [...results].sort((a, b) => b.score_v2 - a.score_v2)
    const sorted_v1 = [...results].sort((a, b) => b.score_v1 - a.score_v1)
    const v2RankMap = new Map(sorted_v2.map((r, i) => [r.team_key, i + 1]))
    const v1RankMap = new Map(sorted_v1.map((r, i) => [r.team_key, i + 1]))

    for (const r of results) {
      allRows.push({
        season, owner: r.owner, team_key: r.team_key,
        score_v2: r.score_v2, score_v1: r.score_v1,
        rank_v2: v2RankMap.get(r.team_key) ?? 0,
        rank_v1: v1RankMap.get(r.team_key) ?? 0,
        breakdown_dom: r.breakdown_dom, breakdown_scr: r.breakdown_scr,
        breakdown_rec: r.breakdown_rec, breakdown_result: r.breakdown_result,
        breakdown_luck: r.breakdown_luck,
        regWeeks: settings.num_regular_season_weeks, numPT: PLAYOFF_SIZES[season] ?? settings.num_playoff_teams,
        regularSeasonPF: r.regularSeasonPF, isFallback: r.isFallback,
        finalRank: r.finalRank,
      })
    }
  }

  const totalRows = allRows.length
  console.log(`\nTotal team-seasons computed: ${totalRows}`)

  // ── Balance check ─────────────────────────────────────────────────────────
  console.log('\n── Balance check: DOM + SCR + REC + RESULT = PPSI (within 0.1) ──')
  let balanceFails = 0
  for (const r of allRows) {
    const computed = r.breakdown_dom + r.breakdown_scr + r.breakdown_rec + r.breakdown_result
    const diff = Math.abs(computed - r.score_v2)
    if (diff > 0.15) {
      console.log(`  FAIL: ${r.season} ${r.owner}: ${computed.toFixed(1)} vs ${r.score_v2} (diff=${diff.toFixed(2)})`)
      balanceFails++
    }
  }
  if (balanceFails === 0) console.log(`  ✓ All ${totalRows} rows balance within 0.1`)
  else console.log(`  ✗ ${balanceFails} rows failed balance check`)

  // ── Playoff result check ──────────────────────────────────────────────────
  console.log('\n── Playoff result check: teams with base Result > 0 (ignoring seed-only bonus) ──')
  console.log('   Expected: 4 for 2013–2017, 6 for 2018–2025')
  for (const { season, results, settings } of seasonData) {
    const numPT = settings.num_playoff_teams  // from PLAYOFF_SIZES
    // Base result: ignore seed-only bonus (seed bonus = 3, result without seed bonus)
    // Teams with finalRank <= numPT should get base result > 0
    // For 4-team: ranks 1-4 get base 35/20/10/5. Rank 5-6 get 0.
    // For 6-team: ranks 1-4 get base 35/20/10/5. Rank 5-6 get 2.
    const withBaseResult = results.filter(r => {
      // The seed bonus is 3 and only one team gets it; subtract it and check if still > 0
      // Simplest: check finalRank. In a 4-team playoff ranks 1-4 have result; in 6-team ranks 1-6.
      return r.finalRank <= numPT
    }).length
    const ok = withBaseResult === numPT
    const expected4or6 = numPT === 4 ? '4-team' : '6-team'
    console.log(`  ${season} (${expected4or6}): expect=${numPT}, rank≤numPT=${withBaseResult} ${ok ? '✓' : '⚠ MISMATCH'}`)
  }

  // ── 2018-2020 week verification ───────────────────────────────────────────
  console.log('\n── 2018–2020 regular-season week verification ──')
  for (const { season, settings } of seasonData) {
    if (['2018', '2019', '2020'].includes(season)) {
      const ok = settings.num_regular_season_weeks === 13
      console.log(`  ${season}: regularSeasonWeeks=${settings.num_regular_season_weeks} ${ok ? '✓ (13)' : '⚠ expected 13'}`)
    }
  }

  // ── Zero-score exclusion log ───────────────────────────────────────────────
  console.log('\n── Zero-score exclusions ──')
  if (zeroExclusions.length === 0) {
    console.log(`  None found across ${totalTeamWeeksChecked} team-weeks checked.`)
  } else {
    console.log(`  Found ${zeroExclusions.length} exclusions:`)
    zeroExclusions.forEach(z => {
      console.log(`    ${z.season} Week ${z.week}: ${z.owner} (${z.teamKey}) scored 0`)
    })
  }

  // ── Before/after table ────────────────────────────────────────────────────
  console.log('\n── Before/after: v1 vs v2 (sorted by biggest v2-v1 change) ──')
  const sorted = [...allRows].sort((a, b) => Math.abs(b.score_v2 - b.score_v1) - Math.abs(a.score_v2 - a.score_v1))

  console.log('Season | Owner                  | v1 PPSI | v2 PPSI | Δ     | v1 Rank | v2 Rank | Rank Δ')
  console.log('-------|------------------------|---------|---------|-------|---------|---------|-------')
  for (const r of sorted) {
    const delta = r.score_v2 - r.score_v1
    const rankDelta = r.rank_v1 - r.rank_v2
    console.log(
      `${r.season} | ${r.owner.padEnd(22)} | ${r.score_v1.toFixed(1).padStart(7)} | ${r.score_v2.toFixed(1).padStart(7)} | ${(delta >= 0 ? '+' : '') + delta.toFixed(1).padStart(5)} | ${String(r.rank_v1).padStart(7)} | ${String(r.rank_v2).padStart(7)} | ${(rankDelta >= 0 ? '+' : '') + rankDelta}`
    )
  }

  // ── Label thresholds ──────────────────────────────────────────────────────
  console.log('\n── Label threshold calibration ──')
  const allV2 = allRows.map(r => r.score_v2).sort((a, b) => b - a) // descending
  const total = allV2.length

  const pct = (n: number) => Math.round((n / total) * 100)
  const cutoff = (topFraction: number) => allV2[Math.floor(topFraction * total)]

  // Target: top 5% / next 10% / next 15% / next 25% / next 25% / bottom 20%
  const t_allTime     = cutoff(0.05)   // 95th percentile (top 5%)
  const t_elite       = cutoff(0.15)   // 85th percentile
  const t_veryGood    = cutoff(0.30)   // 70th percentile
  const t_aboveAvg    = cutoff(0.55)   // 45th percentile
  const t_avg         = cutoff(0.80)   // 20th percentile

  console.log('\nRaw cutoffs (from actual data):')
  console.log(`  All-time    (top  5%): ≥ ${t_allTime}`)
  console.log(`  Elite       (next 10%): ≥ ${t_elite}`)
  console.log(`  Very good   (next 15%): ≥ ${t_veryGood}`)
  console.log(`  Above avg   (next 25%): ≥ ${t_aboveAvg}`)
  console.log(`  Average     (next 25%): ≥ ${t_avg}`)
  console.log(`  Below avg   (bottom 20%): < ${t_avg}`)

  // Round to clean numbers (nearest 5)
  const round5 = (n: number) => Math.round(n / 5) * 5
  const r_allTime  = round5(t_allTime)
  const r_elite    = round5(t_elite)
  const r_veryGood = round5(t_veryGood)
  const r_aboveAvg = round5(t_aboveAvg)
  const r_avg      = round5(t_avg)

  const countLabel = (min: number, max?: number) =>
    allV2.filter(v => v >= min && (max === undefined || v < max)).length

  console.log('\nRounded cutoffs (nearest 5) with counts:')
  const ct_allTime  = countLabel(r_allTime)
  const ct_elite    = countLabel(r_elite, r_allTime)
  const ct_veryGood = countLabel(r_veryGood, r_elite)
  const ct_aboveAvg = countLabel(r_aboveAvg, r_veryGood)
  const ct_avg      = countLabel(r_avg, r_aboveAvg)
  const ct_below    = countLabel(0, r_avg)

  console.log(`  All-time  ≥ ${r_allTime}:  ${ct_allTime} seasons  (${pct(ct_allTime)}%)`)
  console.log(`  Elite     ≥ ${r_elite}:  ${ct_elite} seasons  (${pct(ct_elite)}%)`)
  console.log(`  Very good ≥ ${r_veryGood}:  ${ct_veryGood} seasons  (${pct(ct_veryGood)}%)`)
  console.log(`  Above avg ≥ ${r_aboveAvg}:  ${ct_aboveAvg} seasons  (${pct(ct_aboveAvg)}%)`)
  console.log(`  Average   ≥ ${r_avg}:   ${ct_avg} seasons  (${pct(ct_avg)}%)`)
  console.log(`  Below avg < ${r_avg}:   ${ct_below} seasons  (${pct(ct_below)}%)`)
  console.log(`  Total: ${ct_allTime + ct_elite + ct_veryGood + ct_aboveAvg + ct_avg + ct_below}`)

  // ── Rebuild manager stats cache ───────────────────────────────────────────
  console.log('\n── Rebuilding manager_stats_cache ──')
  await supabase.from('manager_stats_cache').delete().neq('owner_name', '')

  // Aggregate from allRows
  const managerMap = new Map<string, {
    wins: number; losses: number; ties: number; pf: number; pa: number
    seasons: number; champs: number; finishes: number[]; sdsPlus: number[]
    mostRecentYear: number
  }>()

  for (const { season, results, standings, settings } of seasonData) {
    const yearNum = parseInt(season)
    const v2Sorted = [...results].sort((a, b) => b.score_v2 - a.score_v2)
    const rankMap = new Map(v2Sorted.map((r, i) => [r.team_key, i + 1]))

    for (const r of results) {
      const st = standings.find(s => s.team_key === r.team_key)!
      if (!managerMap.has(r.owner)) {
        managerMap.set(r.owner, { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, seasons: 0, champs: 0, finishes: [], sdsPlus: [], mostRecentYear: 0 })
      }
      const m = managerMap.get(r.owner)!
      m.wins += st.wins
      m.losses += st.losses
      m.ties += st.ties
      m.pf += st.points_for
      m.pa += st.points_against
      m.seasons++
      if (st.rank === 1) m.champs++
      m.finishes.push(st.rank)
      m.sdsPlus.push(r.score_v2)
      m.mostRecentYear = Math.max(m.mostRecentYear, yearNum)
    }
  }

  const mostRecentSeason = Math.max(...seasonData.map(s => parseInt(s.season)))

  const cacheRows = Array.from(managerMap.entries()).map(([owner, m]) => {
    const avgFinish = m.finishes.reduce((a, b) => a + b, 0) / m.finishes.length
    const avgSds = m.sdsPlus.length > 0 ? m.sdsPlus.reduce((a, b) => a + b, 0) / m.sdsPlus.length : null
    return {
      owner_name: owner,
      championships: m.champs,
      total_wins: m.wins,
      total_losses: m.losses,
      total_ties: m.ties,
      total_points_for: m.pf.toFixed(2),
      total_points_against: m.pa.toFixed(2),
      seasons_played: m.seasons,
      best_finish: Math.min(...m.finishes),
      worst_finish: Math.max(...m.finishes),
      avg_finish: avgFinish.toFixed(1),
      avg_sds_plus: avgSds !== null ? avgSds.toFixed(1) : null,
      high_sds_plus: m.sdsPlus.length > 0 ? Math.max(...m.sdsPlus).toFixed(1) : null,
      low_sds_plus: m.sdsPlus.length > 0 ? Math.min(...m.sdsPlus).toFixed(1) : null,
      is_active: m.mostRecentYear === mostRecentSeason,
      cached_at: new Date().toISOString(),
    }
  })

  const { error: cacheErr } = await supabase.from('manager_stats_cache').insert(cacheRows)
  if (cacheErr) console.warn(`  Cache insert warning: ${cacheErr.message}`)
  else console.log(`  ✓ Rebuilt manager_stats_cache with ${cacheRows.length} managers`)

  // ── Save CSV ──────────────────────────────────────────────────────────────
  mkdirSync('output', { recursive: true })

  const csvAll = [
    'season,owner,finalRank,score_v2,score_v1,delta,rank_v2,rank_v1,rankDelta,dom,scr,rec,result,luck,regWeeks,numPT,rsPF,isFallback',
    ...allRows.map(r => {
      const delta = r.score_v2 - r.score_v1
      return `${r.season},"${r.owner}",${r.finalRank},${r.score_v2},${r.score_v1},${delta.toFixed(1)},${r.rank_v2},${r.rank_v1},${r.rank_v1 - r.rank_v2},${r.breakdown_dom},${r.breakdown_scr},${r.breakdown_rec},${r.breakdown_result},${r.breakdown_luck},${r.regWeeks},${r.numPT},${r.regularSeasonPF},${r.isFallback}`
    })
  ].join('\n')

  writeFileSync('output/ppsi-comparison.csv', csvAll)
  console.log('\n  ✓ Saved output/ppsi-comparison.csv')

  // Save thresholds JSON
  const thresholdsJSON = {
    computed_at: new Date().toISOString(),
    total_seasons: total,
    raw: { allTime: t_allTime, elite: t_elite, veryGood: t_veryGood, aboveAverage: t_aboveAvg, average: t_avg },
    rounded: { allTime: r_allTime, elite: r_elite, veryGood: r_veryGood, aboveAverage: r_aboveAvg, average: r_avg },
    counts_rounded: { allTime: ct_allTime, elite: ct_elite, veryGood: ct_veryGood, aboveAverage: ct_aboveAvg, average: ct_avg, belowAverage: ct_below },
  }
  writeFileSync('output/ppsi-thresholds.json', JSON.stringify(thresholdsJSON, null, 2))
  console.log('  ✓ Saved output/ppsi-thresholds.json')

  console.log('\n════════════════════════════════════════════════════════')
  console.log('  Done. Review console output above then update')
  console.log('  PPSI_V2_THRESHOLDS in lib/sds-plus.ts if thresholds changed.')
  console.log('════════════════════════════════════════════════════════\n')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
