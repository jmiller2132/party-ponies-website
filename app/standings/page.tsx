import type { Metadata } from "next"
import { getLeagueStandings, getLeagueSettings } from "@/app/actions/yahoo-actions"
import { getCurrentLeagueKey } from "@/lib/league-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { Suspense } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getYearFromLeagueKey } from "@/lib/owner-names"
import { getPlayoffTeamCount } from "@/lib/sds-plus"
import {
  withSeeds,
  playoffTiebreak,
  isSeasonComplete,
  isNewSeasonMissing,
  ordinal,
} from "@/lib/standings-utils"

export const metadata: Metadata = {
  title: "Standings",
  description: "Party Ponies fantasy football league standings, synced from Yahoo Fantasy Sports.",
  openGraph: {
    title: "Standings · Party Ponies",
    description: "League standings for the most recent Party Ponies fantasy football season.",
  },
}

// ─── Standing table skeleton ──────────────────────────────────────────────────

function StandingsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-6 gap-4 pb-2 border-b border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-5 w-full" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Rank badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400 shrink-0" />
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600 shrink-0" />
  return null
}

// ─── Point diff cell ──────────────────────────────────────────────────────────

function PointDiff({ diff }: { diff: number }) {
  if (diff > 0) return (
    <span className="flex items-center justify-end gap-0.5 text-green-500 font-medium">
      <TrendingUp className="h-3 w-3" />
      +{diff.toFixed(0)}
    </span>
  )
  if (diff < 0) return (
    <span className="flex items-center justify-end gap-0.5 text-red-500 font-medium">
      <TrendingDown className="h-3 w-3" />
      {diff.toFixed(0)}
    </span>
  )
  return (
    <span className="flex items-center justify-end gap-0.5 text-muted-foreground">
      <Minus className="h-3 w-3" />0
    </span>
  )
}

// ─── Main table ───────────────────────────────────────────────────────────────

type StandingRow = {
  team_key: string
  rank: number
  owner_name?: string
  name: string
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
}

function LeagueKeyMissing() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>League Key Required</CardTitle>
        <CardDescription>Unable to auto-detect the current league.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Add <code className="px-1 py-0.5 bg-muted rounded text-xs">NEXT_PUBLIC_YAHOO_LEAGUE_KEY</code> to your{" "}
          <code className="px-1 py-0.5 bg-muted rounded text-xs">.env.local</code> and restart the dev server.
        </p>
      </CardContent>
    </Card>
  )
}

async function StandingsTable({ leagueKey, year }: { leagueKey: string; year: number }) {
  const [result, settings] = await Promise.all([
    getLeagueStandings(leagueKey),
    getLeagueSettings(leagueKey),
  ])

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="p-6 space-y-2">
          <p className="text-destructive font-medium">Failed to load standings</p>
          <p className="text-sm text-muted-foreground">
            {result.error?.includes("No tokens found")
              ? "The commissioner needs to sign in once to store authentication tokens."
              : (result.error ?? "An unknown error occurred.")}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Dedupe by team_key
  const seen = new Set<string>()
  const unique = (result.data as StandingRow[]).filter((team) => {
    if (seen.has(team.team_key)) return false
    seen.add(team.team_key)
    return true
  })

  const complete = isSeasonComplete(year)
  // Yahoo settings are authoritative; fall back to the league's known format.
  const playoffSpots =
    (settings.success && settings.data?.num_playoff_teams) || getPlayoffTeamCount(String(year))
  const seeded = withSeeds(unique)
  const tiebreak = playoffTiebreak(seeded, playoffSpots)
  const byeSpots = playoffSpots === 6 ? 2 : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {complete ? `${year} Final Standings` : `${year} Standings`}
          </CardTitle>
          <CardDescription>
            {seeded.length} teams · top {playoffSpots} make the playoffs
            {byeSpots > 0 && ` · seeds 1–${byeSpots} get first-round byes`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-14 pl-6">Seed</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="text-right">Record</TableHead>
                  <TableHead className="text-right">
                    <abbr title="Points for" className="no-underline">PF</abbr>
                  </TableHead>
                  <TableHead className="text-right">
                    <abbr title="Points against" className="no-underline">PA</abbr>
                  </TableHead>
                  <TableHead className={cn("text-right", !complete && "pr-6")}>
                    <abbr title="Point differential (PF − PA)" className="no-underline">Diff</abbr>
                  </TableHead>
                  {complete && <TableHead className="text-right pr-6">Final finish</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {seeded.map((team, index) => {
                  const diff = team.points_for - team.points_against
                  const isLastIn = team.seed === playoffSpots
                  const ownerName = team.owner_name || team.name

                  return (
                    <TableRow
                      key={team.team_key ? `${team.team_key}-${index}` : `row-${index}`}
                      className={cn(
                        "group",
                        team.seed <= playoffSpots ? "bg-green-500/[0.03]" : "",
                        isLastIn && "border-b-2 border-dashed border-primary/60"
                      )}
                    >
                      <TableCell className="pl-6 font-bold tabular-nums">{team.seed}</TableCell>
                      <TableCell>
                        <div>
                          <Link
                            href={`/managers/${encodeURIComponent(ownerName)}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {ownerName}
                          </Link>
                          {team.owner_name && team.name !== team.owner_name && (
                            <p className="text-xs text-muted-foreground">{team.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ""}
                      </TableCell>
                      <TableCell className="text-right font-medium font-mono text-sm">
                        {team.points_for.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono text-sm">
                        {team.points_against.toFixed(2)}
                      </TableCell>
                      <TableCell className={cn("text-right text-sm", !complete && "pr-6")}>
                        <PointDiff diff={diff} />
                      </TableCell>
                      {complete && (
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <RankBadge rank={team.rank} />
                            <span className={cn("font-semibold tabular-nums", team.rank === 1 && "text-yellow-500")}>
                              {team.rank === 1 ? "Champion" : ordinal(team.rank)}
                            </span>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-4 border-t-2 border-dashed border-primary/60" />
              <span>Playoff line (top {playoffSpots})</span>
            </div>
            <span>Seed = regular-season record, ties broken by points for</span>
            {complete && <span>Final finish = place after the playoffs</span>}
          </div>
        </CardContent>
      </Card>

      {tiebreak && (
        <Card>
          <CardContent className="p-5 text-sm">
            <p>
              <span className="font-semibold">Tiebreak at the playoff line:</span>{" "}
              {tiebreak.lastIn} {complete ? "took" : "holds"} the last spot over {tiebreak.firstOut} on points for, by{" "}
              <span className="font-semibold text-yellow-500">{tiebreak.margin.toFixed(2)}</span>{" "}
              {tiebreak.margin === 1 ? "point" : "points"}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StandingsPage() {
  const leagueKey = await getCurrentLeagueKey()
  const now = new Date()
  // The season comes from the league itself, not today's date — otherwise the
  // page claims "2026" while still showing the 2025 league.
  const year = (leagueKey && getYearFromLeagueKey(leagueKey)) || now.getFullYear()
  const newSeasonMissing = leagueKey ? isNewSeasonMissing(year, now) : false

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Standings</h1>
          <p className="text-muted-foreground">
            {year} season · {isSeasonComplete(year, now) ? "final" : "in progress"} · synced from Yahoo Fantasy Sports
          </p>
        </div>
        <Link
          href={`/seasons/${year}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Full {year} season stats →
        </Link>
      </div>

      {newSeasonMissing && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p>
            The {now.getFullYear()} season isn&apos;t connected yet, so these are the {year} final standings.
          </p>
        </div>
      )}

      {leagueKey ? (
        <Suspense fallback={<StandingsTableSkeleton />}>
          <StandingsTable leagueKey={leagueKey} year={year} />
        </Suspense>
      ) : (
        <LeagueKeyMissing />
      )}
    </div>
  )
}
