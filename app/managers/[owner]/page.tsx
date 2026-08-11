import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Medal, Users, ArrowLeft, BarChart3, Target, TrendingUp } from "lucide-react"
import { getManagerStats, getAllManagers, getAllHeadToHeadRecords, ManagerStats } from "@/lib/manager-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Suspense } from "react"
import { cn } from "@/lib/utils"

interface ManagerPageProps {
  params: Promise<{ owner: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number) {
  if (n === 1) return "1st"
  if (n === 2) return "2nd"
  if (n === 3) return "3rd"
  return `${n}th`
}

function ChampTrophies({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <Trophy key={i} className="h-5 w-5 text-yellow-500" />
      ))}
      {count > 5 && <span className="text-sm font-bold text-yellow-500 ml-1">×{count}</span>}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-black">{value}</p>
        {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── All-time stat strip ──────────────────────────────────────────────────────

function ManagerAllTimeStats({ stats }: { stats: ManagerStats }) {
  const games = stats.all_time.total_wins + stats.all_time.total_losses + stats.all_time.total_ties
  const winPct = games > 0
    ? (stats.all_time.total_wins / games * 100).toFixed(1)
    : "0.0"

  const record = `${stats.all_time.total_wins}-${stats.all_time.total_losses}${stats.all_time.total_ties > 0 ? `-${stats.all_time.total_ties}` : ""}`

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Championships"
        value={String(stats.all_time.championships)}
        sub={stats.all_time.championships === 0 ? "No rings yet" : stats.all_time.championships === 1 ? "League champion" : "League champion ×" + stats.all_time.championships}
      />
      <StatCard
        label="Career Record"
        value={record}
        sub={`${winPct}% win rate`}
      />
      <StatCard
        label="Avg Finish"
        value={ordinal(Math.round(stats.all_time.avg_finish))}
        sub={`Best: ${ordinal(stats.all_time.best_finish)} · Worst: ${ordinal(stats.all_time.worst_finish)}`}
      />
      {stats.all_time.avg_sds_plus !== undefined ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PPSI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-black">{stats.all_time.avg_sds_plus.toFixed(1)}</p>
            <div className="flex gap-3 text-sm">
              {stats.all_time.high_sds_plus !== undefined && (
                <span className="text-green-500 font-medium">
                  <TrendingUp className="h-3 w-3 inline mr-0.5" />
                  {stats.all_time.high_sds_plus.toFixed(1)}
                </span>
              )}
              {stats.all_time.low_sds_plus !== undefined && (
                <span className="text-muted-foreground text-xs">
                  Low {stats.all_time.low_sds_plus.toFixed(1)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <StatCard
          label="Seasons Played"
          value={String(stats.all_time.seasons_played)}
          sub={stats.is_active ? "Active manager" : "Inactive"}
        />
      )}
    </div>
  )
}

// ─── Season breakdown table ───────────────────────────────────────────────────

function ManagerSeasonBreakdown({ stats }: { stats: ManagerStats }) {
  if (stats.seasons.length === 0) return null

  const sorted = [...stats.seasons].sort((a, b) => b.year - a.year)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Season-by-Season Breakdown
        </CardTitle>
        <CardDescription>
          {stats.all_time.seasons_played} seasons · sorted newest first
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Year</TableHead>
              <TableHead className="text-right">Finish</TableHead>
              <TableHead className="text-right">Record</TableHead>
              <TableHead className="text-right">Win %</TableHead>
              <TableHead className="text-right">PF</TableHead>
              <TableHead className="text-right">PA</TableHead>
              <TableHead className="text-right pr-6">PPSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((season) => {
              const games = season.wins + season.losses + season.ties
              const winPct = games > 0 ? (season.wins / games * 100).toFixed(1) : "—"
              const record = `${season.wins}-${season.losses}${season.ties > 0 ? `-${season.ties}` : ""}`

              return (
                <TableRow key={season.year}>
                  <TableCell className="pl-6 font-medium">
                    <Link href={`/seasons/${season.year}`} className="hover:text-primary transition-colors">
                      {season.year}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {season.rank === 1 && <Trophy className="h-3.5 w-3.5 text-yellow-500" />}
                      {season.rank === 2 && <Medal className="h-3.5 w-3.5 text-slate-400" />}
                      {season.rank === 3 && <Medal className="h-3.5 w-3.5 text-amber-600" />}
                      <span className={cn(season.rank === 1 && "text-yellow-500 font-bold")}>
                        {ordinal(season.rank)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{record}</TableCell>
                  <TableCell className="text-right text-sm">
                    {winPct}{winPct !== "—" ? "%" : ""}
                  </TableCell>
                  <TableCell className="text-right font-medium font-mono text-sm">
                    {season.points_for.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-mono text-sm">
                    {season.points_against.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {season.sds_plus !== undefined ? (
                      <span className="font-semibold">{season.sds_plus.toFixed(1)}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Head-to-head ─────────────────────────────────────────────────────────────

async function ManagerHeadToHead({ ownerName }: { ownerName: string }) {
  const records = await getAllHeadToHeadRecords(ownerName)

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Head-to-Head Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No head-to-head records found.</p>
        </CardContent>
      </Card>
    )
  }

  const sorted = [...records].sort((a, b) => b.total_games - a.total_games)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Head-to-Head Records
            </CardTitle>
            <CardDescription>All-time matchup record against every opponent · sorted by games played</CardDescription>
          </div>
          <Link href="/rivalry">
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <Target className="h-3.5 w-3.5" />
              Full Rivalry Tool
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Opponent</TableHead>
              <TableHead className="text-right">Record</TableHead>
              <TableHead className="text-right">Win %</TableHead>
              <TableHead className="text-right">Pt Diff</TableHead>
              <TableHead className="text-right pr-6">Games</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((record) => {
              const winPct = record.total_games > 0
                ? (record.wins / record.total_games * 100).toFixed(1)
                : "0.0"
              const ptDiff = record.points_for - record.points_against
              const rec = `${record.wins}-${record.losses}${record.ties > 0 ? `-${record.ties}` : ""}`
              const leads = record.wins > record.losses

              return (
                <TableRow key={record.opponent}>
                  <TableCell className="pl-6">
                    <Link
                      href={`/managers/${encodeURIComponent(record.opponent)}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {record.opponent}
                    </Link>
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-sm font-semibold", leads ? "text-green-500" : record.wins < record.losses ? "text-red-500" : "")}>
                    {rec}
                  </TableCell>
                  <TableCell className="text-right text-sm">{winPct}%</TableCell>
                  <TableCell className={cn("text-right text-sm font-medium", ptDiff > 0 ? "text-green-500" : ptDiff < 0 ? "text-red-500" : "text-muted-foreground")}>
                    {ptDiff >= 0 ? "+" : ""}{ptDiff.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right pr-6 text-muted-foreground text-sm">
                    {record.total_games}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: ManagerPageProps): Promise<Metadata> {
  const { owner } = await params
  const name = decodeURIComponent(owner)
  return {
    title: name,
    description: `${name}'s Party Ponies fantasy football career — all-time record, championships, PPSI scores, and head-to-head history.`,
    openGraph: {
      title: `${name} · Party Ponies`,
      description: `Career stats, championships, and head-to-head record for ${name} across 13+ Party Ponies seasons.`,
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ManagerPage({ params }: ManagerPageProps) {
  const { owner: ownerParam } = await params
  const ownerName = decodeURIComponent(ownerParam)

  const allManagers = await getAllManagers()
  if (!allManagers.includes(ownerName)) notFound()

  const stats = await getManagerStats(ownerName)
  if (!stats) notFound()

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/managers">
            <Button variant="outline" size="sm" className="mt-1">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Managers
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-4xl font-bold">{ownerName}</h1>
              <ChampTrophies count={stats.all_time.championships} />
              {!stats.is_active && (
                <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">Inactive</span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {stats.all_time.seasons_played} {stats.all_time.seasons_played === 1 ? "season" : "seasons"} ·{" "}
              {stats.is_active ? "Active" : "Inactive"} manager
            </p>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <ManagerAllTimeStats stats={stats} />

      {/* Season breakdown */}
      <ManagerSeasonBreakdown stats={stats} />

      {/* Head-to-head */}
      <Suspense fallback={
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
      }>
        <ManagerHeadToHead ownerName={ownerName} />
      </Suspense>
    </div>
  )
}
