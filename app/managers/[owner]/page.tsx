import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, TrendingUp, Users, ArrowLeft, Award, BarChart3 } from "lucide-react"
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

interface ManagerPageProps {
  params: Promise<{ owner: string }>
}

async function ManagerAllTimeStats({ stats }: { stats: ManagerStats }) {
  
  if (!stats) {
    return null
  }
  
  const winPct = stats.all_time.total_wins + stats.all_time.total_losses + stats.all_time.total_ties > 0
    ? (stats.all_time.total_wins / (stats.all_time.total_wins + stats.all_time.total_losses + stats.all_time.total_ties) * 100).toFixed(1)
    : "0.0"
  
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Championships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <span className="text-3xl font-bold">{stats.all_time.championships}</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.all_time.total_wins}-{stats.all_time.total_losses}-{stats.all_time.total_ties}
          </div>
          <div className="text-sm text-muted-foreground mt-1">{winPct}% win rate</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Finish</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.all_time.avg_finish.toFixed(1)}</div>
          <div className="text-sm text-muted-foreground mt-1">
            Best: {stats.all_time.best_finish} | Worst: {stats.all_time.worst_finish}
          </div>
        </CardContent>
      </Card>
      
      {stats.all_time.avg_sds_plus !== undefined && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">SDS+ Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">Average</div>
              <div className="text-2xl font-bold">{stats.all_time.avg_sds_plus.toFixed(1)}</div>
            </div>
            {stats.all_time.high_sds_plus !== undefined && (
              <div>
                <div className="text-xs text-muted-foreground">High</div>
                <div className="text-xl font-semibold text-green-600">{stats.all_time.high_sds_plus.toFixed(1)}</div>
              </div>
            )}
            {stats.all_time.low_sds_plus !== undefined && (
              <div>
                <div className="text-xs text-muted-foreground">Low</div>
                <div className="text-xl font-semibold text-red-600">{stats.all_time.low_sds_plus.toFixed(1)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

async function ManagerSeasonBreakdown({ stats }: { stats: ManagerStats }) {
  
  if (!stats || stats.seasons.length === 0) {
    return null
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Season-by-Season Breakdown
        </CardTitle>
        <CardDescription>
          Complete season history with standings and SDS+ scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Finish</TableHead>
              <TableHead className="text-right">W-L-T</TableHead>
              <TableHead className="text-right">PF</TableHead>
              <TableHead className="text-right">PA</TableHead>
              <TableHead className="text-right">SDS+</TableHead>
              <TableHead className="text-right">SDS+ Rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.seasons.map((season) => (
              <TableRow key={season.year}>
                <TableCell className="font-medium">
                  <Link href={`/seasons/${season.year}`} className="hover:text-primary">
                    {season.year}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {season.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                    {season.rank === 2 && <Medal className="h-4 w-4 text-gray-400" />}
                    {season.rank === 3 && <Medal className="h-4 w-4 text-amber-600" />}
                    <span>{season.rank}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {season.wins}-{season.losses}-{season.ties}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {season.points_for.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {season.points_against.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {season.sds_plus !== undefined ? (
                    <span className="font-semibold">{season.sds_plus.toFixed(1)}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {season.sds_rank !== undefined ? (
                    <span className="text-muted-foreground">#{season.sds_rank}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

async function ManagerHeadToHead({ ownerName }: { ownerName: string }) {
  const headToHeadRecords = await getAllHeadToHeadRecords(ownerName)
  
  if (headToHeadRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Head-to-Head Records
          </CardTitle>
          <CardDescription>
            Matchup history against other managers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No head-to-head records found.</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Head-to-Head Records
        </CardTitle>
        <CardDescription>
          All-time matchup history against other managers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opponent</TableHead>
              <TableHead className="text-right">Record</TableHead>
              <TableHead className="text-right">Win %</TableHead>
              <TableHead className="text-right">PF</TableHead>
              <TableHead className="text-right">PA</TableHead>
              <TableHead className="text-right">Games</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headToHeadRecords.map((record) => {
              const winPct = record.total_games > 0
                ? (record.wins / record.total_games * 100).toFixed(1)
                : "0.0"
              
              return (
                <TableRow key={record.opponent}>
                  <TableCell className="font-medium">
                    <Link href={`/managers/${encodeURIComponent(record.opponent)}`} className="hover:text-primary">
                      {record.opponent}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {record.wins}-{record.losses}-{record.ties}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {winPct}%
                  </TableCell>
                  <TableCell className="text-right">
                    {record.points_for.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {record.points_against.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
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

export default async function ManagerPage({ params }: ManagerPageProps) {
  const { owner: ownerParam } = await params
  const ownerName = decodeURIComponent(ownerParam)
  
  // Verify manager exists
  const allManagers = await getAllManagers()
  if (!allManagers.includes(ownerName)) {
    notFound()
  }
  
  const stats = await getManagerStats(ownerName)
  
  if (!stats) {
    notFound()
  }
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/managers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Managers
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h1 className="font-display text-4xl font-bold">{ownerName}</h1>
              {stats.all_time.championships > 0 && (
                <Trophy className="h-6 w-6 text-yellow-500" />
              )}
            </div>
            <p className="text-muted-foreground">
              Manager profile with all-time records and season history
            </p>
          </div>
        </div>
      </div>

      {/* All-Time Stats */}
      <ManagerAllTimeStats stats={stats} />

      {/* Season Breakdown */}
      <ManagerSeasonBreakdown stats={stats} />

      {/* Head-to-Head Records */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading head-to-head records...</p>
          </CardContent>
        </Card>
      }>
        <ManagerHeadToHead ownerName={ownerName} />
      </Suspense>
    </div>
  )
}
