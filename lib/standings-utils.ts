/**
 * Shared standings helpers: regular-season seeding, playoff line, and
 * season-status labels. No project imports beyond pure modules so this can
 * be used from any server component.
 */

export interface StandingLike {
  team_key: string
  rank: number
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
}

export type Seeded<T extends StandingLike> = T & { seed: number }

/** Regular-season win% with ties as half a win. */
export function winPct(t: Pick<StandingLike, "wins" | "losses" | "ties">): number {
  const games = t.wins + t.losses + t.ties
  return games > 0 ? (t.wins + 0.5 * t.ties) / games : 0
}

/**
 * Regular-season seeds: best win%, then points for (Yahoo's default
 * tiebreaker, and the one PPSI's seed bonus uses).
 *
 * Yahoo's `rank` is the FINAL finish once playoffs are done, so it can't be
 * used as the regular-season order — a 7-7 champion would sort above a 10-4
 * runner-up.
 */
export function withSeeds<T extends StandingLike>(standings: T[]): Seeded<T>[] {
  return [...standings]
    .sort((a, b) => winPct(b) - winPct(a) || b.points_for - a.points_for)
    .map((t, i) => ({ ...t, seed: i + 1 }))
}

/**
 * When the last team in and the first team out have the same record, describe
 * the points-for tiebreak. Returns null if the cut wasn't decided by a tie.
 */
export function playoffTiebreak<T extends StandingLike & { owner_name?: string; name: string }>(
  seeded: Seeded<T>[],
  playoffSpots: number,
): { lastIn: string; firstOut: string; margin: number } | null {
  const lastIn = seeded[playoffSpots - 1]
  const firstOut = seeded[playoffSpots]
  if (!lastIn || !firstOut) return null
  if (lastIn.wins !== firstOut.wins || lastIn.losses !== firstOut.losses || lastIn.ties !== firstOut.ties) {
    return null
  }
  return {
    lastIn: lastIn.owner_name || lastIn.name,
    firstOut: firstOut.owner_name || firstOut.name,
    margin: Math.round((lastIn.points_for - firstOut.points_for) * 100) / 100,
  }
}

/**
 * A league's season is finished once the calendar has moved past its year
 * (NFL fantasy seasons end in late December / early January).
 */
export function isSeasonComplete(leagueYear: number, now: Date = new Date()): boolean {
  return leagueYear < now.getFullYear()
}

/**
 * True when a newer season is very likely underway but the site is still
 * pointed at last year's league (NFL regular season starts in September;
 * Yahoo leagues are usually created by August).
 */
export function isNewSeasonMissing(leagueYear: number, now: Date = new Date()): boolean {
  return leagueYear < now.getFullYear() && now.getMonth() >= 7 // Aug–Dec
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
