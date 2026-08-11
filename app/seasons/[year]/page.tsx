import type { Metadata } from "next"
import { getLeagueStandings, getWeekMatchups, getSDSPlusScores } from "@/app/actions/yahoo-actions"
import { getLeagueKeyForYear, getAvailableYears } from "@/lib/season-utils"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trophy, Medal, Calendar, ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Award, Zap, BarChart3, Sparkles, Minus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import { cn } from "@/lib/utils"
import { SDSPlusTable } from "@/components/sds-plus-table"
import { PlayoffBracketComponent } from "@/components/playoff-bracket"

interface SeasonPageProps {
  params: Promise<{ year: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function OwnerLink({ owner, teamName }: { owner: string; teamName?: string }) {
  return (
    <div>
      <Link
        href={`/managers/${encodeURIComponent(owner)}`}
        className="font-semibold hover:text-primary transition-colors"
      >
        {owner}
      </Link>
      {teamName && teamName !== owner && (
        <p className="text-xs text-muted-foreground">{teamName}</p>
      )}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400 shrink-0" />
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600 shrink-0" />
  return null
}

function PointDiffCell({ diff }: { diff: number }) {
  if (diff > 0) return (
    <span className="flex items-center justify-end gap-0.5 text-green-500 font-medium text-sm">
      <TrendingUp className="h-3 w-3" />+{diff.toFixed(0)}
    </span>
  )
  if (diff < 0) return (
    <span className="flex items-center justify-end gap-0.5 text-red-500 font-medium text-sm">
      <TrendingDown className="h-3 w-3" />{diff.toFixed(0)}
    </span>
  )
  return (
    <span className="flex items-center justify-end gap-0.5 text-muted-foreground text-sm">
      <Minus className="h-3 w-3" />0
    </span>
  )
}

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Standings ────────────────────────────────────────────────────────────────

async function SeasonStandings({ leagueKey, year }: { leagueKey: string; year: number }) {
  const result = await getLeagueStandings(leagueKey)

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive font-medium">Failed to load standings</p>
          <p className="text-sm text-muted-foreground mt-1">{result.error ?? "An unknown error occurred."}</p>
        </CardContent>
      </Card>
    )
  }

  const standings = result.data
    .sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)

  const playoffSpots = standings.length <= 10 ? 4 : 6

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {year} Final Standings
        </CardTitle>
        <CardDescription>
          {standings.length} teams · top {playoffSpots} made playoffs
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
              <TableHead className="text-right">PPG</TableHead>
              <TableHead className="text-right pr-6">+/−</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team: {
              team_key: string; rank: number; owner_name?: string; name: string;
              wins: number; losses: number; ties: number; points_for: number; points_against: number;
            }, index: number) => {
              const games = team.wins + team.losses + team.ties
              const winPct = games > 0 ? (team.wins / games * 100).toFixed(1) : "—"
              const ppg = games > 0 ? (team.points_for / games).toFixed(1) : "—"
              const diff = team.points_for - team.points_against
              const owner = team.owner_name || team.name
              const isPlayoffCutoff = team.rank === playoffSpots

              return (
                <TableRow
                  key={`${team.team_key}-${index}`}
                  className={cn(
                    team.rank <= playoffSpots ? "bg-green-500/[0.03]" : "",
                    isPlayoffCutoff && "border-b-2 border-primary/40"
                  )}
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-1.5">
                      <RankBadge rank={team.rank} />
                      <span className={cn("font-bold tabular-nums", team.rank === 1 && "text-yellow-500")}>
                        {team.rank}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OwnerLink owner={owner} teamName={team.name} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ""}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {winPct}{winPct !== "—" ? "%" : ""}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium font-mono">
                    {ppg}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <PointDiffCell diff={diff} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <div className="flex items-center gap-4 px-6 py-3 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary/50 rounded" />
            Playoff cutoff
          </span>
          <span>PPG = Points per game · +/− = Point differential</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Season Records ────────────────────────────────────────────────────────────

async function SeasonRecords({ leagueKey, year }: { leagueKey: string; year: number }) {
  const result = await getLeagueStandings(leagueKey)
  if (!result.success || !result.data?.length) return null

  const standings = result.data

  const highPF  = standings.reduce((m: typeof standings[0], t: typeof standings[0]) => t.points_for > m.points_for ? t : m, standings[0])
  const lowPF   = standings.reduce((m: typeof standings[0], t: typeof standings[0]) => t.points_for < m.points_for ? t : m, standings[0])
  const bestRec = standings.reduce((m: typeof standings[0], t: typeof standings[0]) => {
    const mG = m.wins + m.losses + m.ties, tG = t.wins + t.losses + t.ties
    return (t.wins / (tG || 1)) > (m.wins / (mG || 1)) ? t : m
  }, standings[0])
  const bestDef = standings.reduce((m: typeof standings[0], t: typeof standings[0]) => t.points_against < m.points_against ? t : m, standings[0])

  const records = [
    { icon: Zap,        color: "text-yellow-500", label: "Highest PF",   owner: highPF.owner_name  || highPF.name,  value: highPF.points_for.toFixed(0)  + " pts" },
    { icon: TrendingUp, color: "text-green-500",  label: "Best Record",  owner: bestRec.owner_name || bestRec.name, value: `${bestRec.wins}-${bestRec.losses}` },
    { icon: Award,      color: "text-blue-500",   label: "Best Defense", owner: bestDef.owner_name || bestDef.name, value: bestDef.points_against.toFixed(0) + " PA" },
    { icon: TrendingDown, color: "text-red-500",  label: "Lowest PF",    owner: lowPF.owner_name   || lowPF.name,  value: lowPF.points_for.toFixed(0)   + " pts" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          {year} Season Records
        </CardTitle>
        <CardDescription>Notable achievements from the {year} season</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {records.map((r) => {
            const Icon = r.icon
            return (
              <div key={r.label} className="p-4 rounded-lg border border-border/60">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("h-4 w-4", r.color)} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{r.label}</span>
                </div>
                <p className="text-xl font-black">{r.value}</p>
                <Link
                  href={`/managers/${encodeURIComponent(r.owner)}`}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {r.owner}
                </Link>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── PPSI ─────────────────────────────────────────────────────────────────────

async function PPSIMetrics({ leagueKey, year }: { leagueKey: string; year: number }) {
  const result = await getSDSPlusScores(leagueKey)
  if (!result.success || !result.data?.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          PPSI — Party Ponies Season Index
        </CardTitle>
        <CardDescription>
          Four-pillar metric (Dominance, Scoring, Schedule Luck, Season Result) for cross-season comparison. Click headers to sort.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SDSPlusTable scores={result.data} defaultSort="score" defaultDirection="desc" />
        <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-5 gap-2 text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
          <div><strong className="text-yellow-600">110+</strong> — All-time / generational</div>
          <div><strong className="text-blue-600">95–109</strong> — Elite</div>
          <div><strong className="text-green-600">80–94</strong> — Very good</div>
          <div><strong className="text-foreground/70">65–79</strong> — Solid</div>
          <div><strong className="text-red-600">&lt;65</strong> — Below average</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Weekly Scores ────────────────────────────────────────────────────────────

async function WeeklyScoresBreakdown({ leagueKey, year }: { leagueKey: string; year: number }) {
  const weeks = [1, 2, 3, 4, 5, 6]

  // Fetch all weeks in parallel
  const results = await Promise.all(
    weeks.map(w => getWeekMatchups(leagueKey, w).then(r => ({ week: w, r })))
  )

  const weeklyData = results
    .filter(({ r }) => r.success && r.data?.length)
    .map(({ week, r }) => ({ week, matchups: r.data! }))

  if (weeklyData.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Weekly Scores
        </CardTitle>
        <CardDescription>Per-week scoring summary for the {year} season</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {weeklyData.map(({ week, matchups }) => {
            const allScores: number[] = matchups.flatMap((m: { team1: { points: number }; team2: { points: number } }) => [m.team1.points, m.team2.points])
            const high = Math.max(...allScores)
            const low  = Math.min(...allScores)
            const avg  = allScores.reduce((a, b) => a + b, 0) / allScores.length

            return (
              <div key={week} className="p-3 rounded-lg border border-border/60 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Week {week}</p>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="text-base font-bold text-green-500">{high.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">High</p>
                  </div>
                  <div>
                    <p className="text-base font-bold">{avg.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Avg</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-red-500">{low.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Low</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Playoff Bracket ──────────────────────────────────────────────────────────

async function PlayoffBracket({ leagueKey }: { leagueKey: string }) {
  const result = await getLeagueStandings(leagueKey)
  if (!result.success || !result.data?.length) return null
  return <PlayoffBracketComponent standings={result.data} year={0} />
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  const { year } = await params
  return {
    title: `${year} Season`,
    description: `Party Ponies fantasy football ${year} season — standings, champion, PPSI scores, playoff bracket, and full stats.`,
    openGraph: {
      title: `${year} Season · Party Ponies`,
      description: `Full standings, champion, and PPSI scores for the ${year} Party Ponies fantasy football season.`,
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SeasonPage({ params }: SeasonPageProps) {
  const { year: yearParam } = await params
  const year = parseInt(yearParam)

  const availableYears = await getAvailableYears()
  if (isNaN(year) || !availableYears.includes(year)) notFound()

  const leagueKey = await getLeagueKeyForYear(year)
  if (!leagueKey) notFound()

  const currentYear = new Date().getFullYear()
  const isCurrentSeason = year === currentYear
  const yearIndex = availableYears.indexOf(year)
  const prevYear = yearIndex > 0 ? availableYears[yearIndex - 1] : null
  const nextYear = yearIndex < availableYears.length - 1 ? availableYears[yearIndex + 1] : null

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/seasons">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Seasons
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h1 className="font-display text-4xl font-bold">{year} Season</h1>
              {isCurrentSeason && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-primary/20 text-primary rounded-full">
                  Current
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Standings, PPSI scores, and playoff bracket
            </p>
          </div>
        </div>

        {/* Prev / Next season nav */}
        <div className="flex items-center gap-2">
          {prevYear && (
            <Link href={`/seasons/${prevYear}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />{prevYear}
              </Button>
            </Link>
          )}
          {nextYear && (
            <Link href={`/seasons/${nextYear}`}>
              <Button variant="outline" size="sm">
                {nextYear}<ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 1. Standings */}
      <Suspense fallback={<SectionSkeleton rows={10} />}>
        <SeasonStandings leagueKey={leagueKey} year={year} />
      </Suspense>

      {/* 2. Season Records (stat highlights) */}
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <SeasonRecords leagueKey={leagueKey} year={year} />
      </Suspense>

      {/* 3. PPSI */}
      <Suspense fallback={<SectionSkeleton rows={10} />}>
        <PPSIMetrics leagueKey={leagueKey} year={year} />
      </Suspense>

      {/* 4. Weekly Scores */}
      <Suspense fallback={<SectionSkeleton rows={3} />}>
        <WeeklyScoresBreakdown leagueKey={leagueKey} year={year} />
      </Suspense>

      {/* 5. Playoff Bracket */}
      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <PlayoffBracket leagueKey={leagueKey} />
      </Suspense>
    </div>
  )
}
