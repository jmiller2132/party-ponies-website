// Diagnose what the stored Yahoo token can access. Run: npx tsx scripts/yahoo-diag.ts
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const admin = process.env.YAHOO_ADMIN_USER_ID
  let q = s.from('yahoo_tokens').select('user_id, refresh_token, updated_at')
  q = admin ? q.eq('user_id', admin) : q.order('updated_at', { ascending: false })
  const { data } = await q.limit(1).single()
  if (!data) throw new Error('no token row')
  console.log('token row:', data.user_id, 'updated', data.updated_at)

  const r = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: data.refresh_token }),
  })
  const tok = await r.json()
  console.log('refresh:', r.status, 'xoauth_yahoo_guid =', tok.xoauth_yahoo_guid ?? '(none)', '| scope =', tok.scope ?? '(not returned)')
  if (!tok.access_token) return console.log(tok)
  await s.from('yahoo_tokens').update({
    access_token: tok.access_token, refresh_token: tok.refresh_token || data.refresh_token,
    expires_at: Date.now() + tok.expires_in * 1000, updated_at: new Date().toISOString(),
  }).eq('user_id', data.user_id)

  const keys = (process.env.NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
  const tests: [string, string][] = [
    ['my games', '/users;use_login=1/games;format=json'],
    ...keys.map(k => [`league ${k}`, `/league/${k}/metadata;format=json`] as [string, string]),
  ]
  for (const [label, path] of tests) {
    const res = await fetch('https://fantasysports.yahooapis.com/fantasy/v2' + path, { headers: { Authorization: `Bearer ${tok.access_token}` } })
    const body = await res.text()
    const name = body.match(/"name":"([^"]+)"/)?.[1] ?? body.match(/<description>([^<]+)/)?.[1] ?? ''
    console.log(`${res.status}  ${label}  ${name.slice(0, 80)}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
