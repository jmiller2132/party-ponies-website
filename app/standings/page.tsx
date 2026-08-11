import type { Metadata } from "next"
import { getLeagueStandings } from "@/app/actions/yahoo-actions"
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
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Suspense } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Standings",
  description: "Current Party Ponies fantasy football league standings, synced live from Yahoo Fantasy Sports.",
  openGraph: {
    title: "Standings · Party Ponies",
    description: "Live league standings for the current Party Ponies fantasy football season.",
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

async function StandingsTable() {
  const leagueKey = await getCurrentLeagueKey()

  if (!leagueKey) {
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

  const result = await getLeagueStandings(leagueKey)

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
  const standings = result.data
    .filter((team: { team_key: string }) => {
      if (seen.has(team.team_key)) return false
      seen.add(team.team_key)
      return true
    })
    .sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)

  // Determine playoff cutoff — top 4 for ≤10 teams, top 6 for larger leagues
  const playoffSpots = standings.length <= 10 ? 4 : 6
  const lastPlayoffRank = playoffSpots

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Current Standings
        </CardTitle>
        <CardDescription>
          {standings.length} teams · top {playoffSpots} make playoffs
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14 pl-6">Rank</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead className="text-right">Record</TableHead>
              <TableHead className="text-right">Win %</TableHead>
              <TableHead className="text-right">PF</TableHead>
              <TableHead className="text-right pr-6">+/−</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team: {
              team_key: string
              rank: number
              owner_name: string
              name: string
              wins: number
              losses: number
              ties: number
              points_for: number
              points_against: number
            }, index: number) => {
              const games = team.wins + team.losses + team.ties
              const winPct = games > 0 ? (team.wins / games * 100).toFixed(1) : "—"
              const diff = team.points_for - team.points_against
              const isPlayoffCutoff = team.rank === lastPlayoffRank
              const ownerName = team.owner_name || team.name

              return (
                <TableRow
                  key={team.team_key ? `${team.team_key}-${index}` : `row-${index}`}
                  className={cn(
                    "group",
                    team.rank <= lastPlayoffRank ? "bg-green-500/[0.03]" : "",
                    isPlayoffCutoff && "border-b-2 border-primary/40"
                  )}
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-1.5">
                      <RankBadge rank={team.rank} />
                      <span className={cn(
                        "font-bold tabular-nums",
                        team.rank === 1 && "text-yellow-500"
                      )}>
                        {team.rank}
                      </span>
                    </div>
                  </TableCell>
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
                  <TableCell className="text-right text-sm">
                    {winPct}{winPct !== "—" ? "%" : ""}
                  </TableCell>
                  <TableCell className="text-right font-medium font-mono text-sm">
                    {team.points_for.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right pr-6 text-sm">
                    <PointDiff diff={diff} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary/50 rounded" />
            <span>Playoff cutoff (top {playoffSpots})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span>Point differential</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StandingsPage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Standings</h1>
          <p className="text-muted-foreground">
            {currentYear} season · synced from Yahoo Fantasy Sports
          </p>
        </div>
        <Link
          href={`/seasons/${currentYear}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Full season stats →
        </Link>
      </div>

      <Suspense fallback={<StandingsTableSkeleton />}>
        <StandingsTable />
      </Suspense>
    </div>
  )
}
