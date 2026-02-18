import { NextResponse } from 'next/server'

/**
 * Keepalive endpoint to prevent Supabase free-tier project pause.
 * Supabase pauses projects after ~7 days of inactivity.
 * Hit this URL every 5–6 days (e.g. via cron-job.org or UptimeRobot).
 */
export async function GET() {
  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase')
    const supabase = createServerSupabaseClient()
    await supabase.from('league_standings').select('league_key').limit(1)
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Supabase unreachable (project may be paused)'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 200 }
    )
  }
}
