import { getLeagueStandings, getCurrentWeekMatchups, getWeekMatchups, getSDSPlusScores } from "@/app/actions/yahoo-actions"
import { getLeagueKeyForYear, getAvailableYears } from "@/lib/season-utils"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trophy, Medal, Calendar, ArrowLeft, ArrowRight, TrendingUp, Award, Zap, BarChart3, Users, Target, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import { cn } from "@/lib/utils"
import { SDSPlusTable } from "@/components/sds-plus-table"
import { PlayoffBracketComponent } from "@/components/playoff-bracket"

interface SeasonPageProps {
  params: Promise<{ year: string }>
}

async function SeasonStandings({ year }: { year: number }) {
  const leagueKey = await getLeagueKeyForYear(year)
  
  if (!leagueKey) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            No league data available for {year} season.
          </p>
        </CardContent>
      </Card>
    )
  }

  const result = await getLeagueStandings(leagueKey)

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">
            {result.error || "Failed to load standings."}
          </p>
        </CardContent>
      </Card>
    )
  }

  const standings = result.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {year} Season Standings
        </CardTitle>
        <CardDescription>
          Final standings for the {year} season
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">W-L-T</TableHead>
              <TableHead className="text-right">Points For</TableHead>
              <TableHead className="text-right">Points Against</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team) => (
              <TableRow key={team.team_key}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {team.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                    {team.rank === 2 && <Medal className="h-4 w-4 text-gray-400" />}
                    {team.rank === 3 && <Medal className="h-4 w-4 text-amber-600" />}
                    <span>{team.rank}</span>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">
                  {team.owner_name || team.name}
                  {team.owner_name && team.name && team.name !== team.owner_name && (
                    <span className="text-xs text-muted-foreground ml-2 font-normal">({team.name})</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {team.wins}-{team.losses}
                  {team.ties > 0 && `-${team.ties}`}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {team.points_for.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {team.points_against.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


async function SeasonChampion({ year }: { year: number }) {
  const leagueKey = await getLeagueKeyForYear(year)
  
  if (!leagueKey) {
    return null
  }

  const result = await getLeagueStandings(leagueKey)

  if (!result.success || !result.data || result.data.length === 0) {
    return null
  }

  const champion = result.data.find(team => team.rank === 1)
  
  if (!champion) {
    return null
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          {year} Season Champion
        </CardTitle>
        <CardDescription>League champion and final standings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <div>
              <h3 className="text-2xl font-bold">{champion.owner_name || champion.name}</h3>
              {champion.owner_name && champion.name && champion.name !== champion.owner_name && (
                <p className="text-sm text-muted-foreground font-normal">{champion.name}</p>
              )}
              <p className="text-muted-foreground mt-1">
                Record: {champion.wins}-{champion.losses}
                {champion.ties > 0 && `-${champion.ties}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Points For</p>
              <p className="text-2xl font-bold">{champion.points_for.toFixed(2)}</p>
            </div>
          </div>
          
          {/* Runner-up and 3rd place */}
          <div className="grid md:grid-cols-2 gap-4">
            {result.data.find(team => team.rank === 2) && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Medal className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold">Runner-Up</span>
                </div>
                <p className="font-medium">
                  {(() => {
                    const team = result.data.find(team => team.rank === 2)
                    if (!team) return null
                    return (
                      <>
                        {team.owner_name || team.name}
                        {team.owner_name && team.name && team.name !== team.owner_name && (
                          <span className="text-xs text-muted-foreground font-normal ml-1">({team.name})</span>
                        )}
                      </>
                    )
                  })()}
                </p>
              </div>
            )}
            {result.data.find(team => team.rank === 3) && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Medal className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold">3rd Place</span>
                </div>
                <p className="font-medium">
                  {(() => {
                    const team = result.data.find(team => team.rank === 3)
                    if (!team) return null
                    return (
                      <>
                        {team.owner_name || team.name}
                        {team.owner_name && team.name && team.name !== team.owner_name && (
                          <span className="text-xs text-muted-foreground font-normal ml-1">({team.name})</span>
                        )}
                      </>
                    )
                  })()}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

async function SeasonRecords({ year }: { year: number }) {
  const leagueKey = await getLeagueKeyForYear(year)
  
  if (!leagueKey) {
    return null
  }

  const standingsResult = await getLeagueStandings(leagueKey)
  
  if (!standingsResult.success || !standingsResult.data || standingsResult.data.length === 0) {
    return null
  }

  const standings = standingsResult.data

  // Calculate season records
  const highestPointsFor = standings.reduce((max, team) => 
    team.points_for > max.points_for ? team : max, standings[0]
  )
  
  const lowestPointsAgainst = standings.reduce((min, team) => 
    team.points_against < min.points_against ? team : min, standings[0]
  )
  
  const bestRecord = standings.reduce((best, team) => {
    const bestWinPct = best.wins / (best.wins + best.losses + best.ties)
    const teamWinPct = team.wins / (team.wins + team.losses + team.ties)
    return teamWinPct > bestWinPct ? team : best
  }, standings[0])

  // Try to get weekly data for highest single-week score
  // For now, we'll use Points For as a proxy (could be enhanced with weekly data)
  const records = [
    {
      icon: Zap,
      title: "Highest Points For",
      owner: highestPointsFor.owner_name || highestPointsFor.name,
      teamName: highestPointsFor.name,
      value: highestPointsFor.points_for.toFixed(2),
      description: "Most total points scored in the season",
    },
    {
      icon: TrendingUp,
      title: "Best Record",
      owner: bestRecord.owner_name || bestRecord.name,
      teamName: bestRecord.name,
      value: `${bestRecord.wins}-${bestRecord.losses}${bestRecord.ties > 0 ? `-${bestRecord.ties}` : ''}`,
      description: "Best win-loss record",
    },
    {
      icon: Award,
      title: "Best Defense",
      owner: lowestPointsAgainst.owner_name || lowestPointsAgainst.name,
      teamName: lowestPointsAgainst.name,
      value: lowestPointsAgainst.points_against.toFixed(2),
      description: "Fewest points allowed",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          {year} Season Records
        </CardTitle>
        <CardDescription>Notable achievements and records from the {year} season</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {records.map((record, index) => {
            const Icon = record.icon
            return (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">{record.title}</h4>
                </div>
                <p className="text-2xl font-bold mb-1">{record.value}</p>
                <p className="text-sm font-medium">
                  {record.owner}
                  {record.owner !== record.teamName && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">({record.teamName})</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{record.description}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

async function WeeklyScoresBreakdown({ year }: { year: number }) {
  const leagueKey = await getLeagueKeyForYear(year)
  
  if (!leagueKey) {
    return null
  }

  // Fetch a few weeks of data (weeks 1-4 as example)
  const weeks = [1, 2, 3, 4]
  const weeklyData: { week: number; matchups: any[] }[] = []

  for (const week of weeks) {
    const result = await getWeekMatchups(leagueKey, week)
    if (result.success && result.data && result.data.length > 0) {
      weeklyData.push({ week, matchups: result.data })
    }
  }

  if (weeklyData.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Weekly Scores Breakdown
        </CardTitle>
        <CardDescription>Weekly scoring summary for the {year} season</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeklyData.map(({ week, matchups }) => {
            const allScores = matchups.flatMap(m => [m.team1.points, m.team2.points])
            const highestScore = Math.max(...allScores)
            const lowestScore = Math.min(...allScores)
            const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length

            return (
              <div key={week} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Week {week}</h4>
                  <span className="text-sm text-muted-foreground">
                    {matchups.length} matchups
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Highest Score</p>
                    <p className="font-bold text-lg">{highestScore.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Average Score</p>
                    <p className="font-bold text-lg">{avgScore.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lowest Score</p>
                    <p className="font-bold text-lg">{lowestScore.toFixed(2)}</p>
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

async function HeadToHeadRecords({ year }: { year: number }) {
  const leagueKey = await getLeagueKeyForYear(year)
  
  if (!leagueKey) {
    return null
  }

  const standingsResult = await getLeagueStandings(leagueKey)
  
  if (!standingsResult.success || !standingsResult.data || standingsResult.data.length === 0) {
    return null
  }

  const standings = standingsResult.data

  // Calculate head-to-head records (simplified - would need matchup history for full accuracy)
  // For now, show win percentages and common opponents
  const h2hRecords = standings.map(team => {
    const winPct = team.wins / (team.wins + team.losses + team.ties) || 0
    return {
      owner: team.owner_name || team.name,
      teamName: team.name,
      team_key: team.team_key,
      wins: team.wins,
      losses: team.losses,
      winPct: winPct,
      pointsFor: team.points_for,
    }
  }).sort((a, b) => b.winPct - a.winPct)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Head-to-Head Records
        </CardTitle>
        <CardDescription>Win percentages and records for the {year} season</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">W-L</TableHead>
              <TableHead className="text-right">Win %</TableHead>
              <TableHead className="text-right">Points For</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {h2hRecords.map((record) => (
              <TableRow key={record.team_key}>
                <TableCell className="font-semibold">
                  {record.owner}
                  {record.owner !== record.teamName && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">({record.teamName})</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {record.wins}-{record.losses}
                </TableCell>
                <TableCell className="text-right">
                  {(record.winPct * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-medium">
                  {record.pointsFor.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

async function SDSPlusMetrics({ year }: { year: number }) {
  const leagueKey = await getLeagueKeyForYear(year)
  
  if (!leagueKey) {
    return null
  }

  const result = await getSDSPlusScores(leagueKey)

  if (!result.success || !result.data || result.data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          SDS+ (Season Dominance Score Plus)
        </CardTitle>
        <CardDescription>
          A luck-adjusted dominance metric that prioritizes true performance over playoff variance.
          Click column headers to sort. Hover over column headers for metric explanations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SDSPlusTable scores={result.data} defaultSort="finalRank" defaultDirection="asc" />
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Interpretation Guide</h4>
          <div className="grid md:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div><strong className="text-yellow-600">95+</strong> → All-time, era-defining season</div>
            <div><strong className="text-blue-600">85–94</strong> → Dominant, likely robbed by variance</div>
            <div><strong className="text-green-600">75–84</strong> → Elite champion or contender</div>
            <div><strong className="text-gray-600">65–74</strong> → Solid title or strong season</div>
            <div><strong>&lt;65</strong> → Average or luck-driven outcome</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

async function PerformanceTrends({ year }: { year: number }) {
  const leagueKey = await getLeagueKeyForYear(year)
  
  if (!leagueKey) {
    return null
  }

  const standingsResult = await getLeagueStandings(leagueKey)
  
  if (!standingsResult.success || !standingsResult.data || standingsResult.data.length === 0) {
    return null
  }

  const standings = standingsResult.data

  // Calculate trends: points per game, consistency, etc.
  const trends = standings.map(team => {
    const gamesPlayed = team.wins + team.losses + team.ties
    const pointsPerGame = gamesPlayed > 0 ? team.points_for / gamesPlayed : 0
    const pointsAgainstPerGame = gamesPlayed > 0 ? team.points_against / gamesPlayed : 0
    
    return {
      owner: team.owner_name || team.name,
      teamName: team.name,
      team_key: team.team_key,
      pointsPerGame: pointsPerGame,
      pointsAgainstPerGame: pointsAgainstPerGame,
      differential: pointsPerGame - pointsAgainstPerGame,
      rank: team.rank,
    }
  }).sort((a, b) => b.differential - a.differential)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Trends
        </CardTitle>
        <CardDescription>Points per game and performance metrics for the {year} season</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">PPG</TableHead>
              <TableHead className="text-right">PAPG</TableHead>
              <TableHead className="text-right">Differential</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trends.map((trend) => (
              <TableRow key={trend.team_key}>
                <TableCell className="font-semibold">
                  {trend.owner}
                  {trend.owner !== trend.teamName && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">({trend.teamName})</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {trend.pointsPerGame.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {trend.pointsAgainstPerGame.toFixed(2)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  trend.differential > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {trend.differential > 0 ? '+' : ''}{trend.differential.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

async function PlayoffBracket({ year }: { year: number }) {
  const leagueKey = await getLeagueKeyForYear(year)
  
  if (!leagueKey) {
    return null
  }

  const standingsResult = await getLeagueStandings(leagueKey)
  
  if (!standingsResult.success || !standingsResult.data || standingsResult.data.length === 0) {
    return null
  }

  const standings = standingsResult.data
  
  return <PlayoffBracketComponent standings={standings} year={year} />
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const { year: yearParam } = await params
  const year = parseInt(yearParam)
  
  const availableYears = await getAvailableYears()
  
  if (isNaN(year) || !availableYears.includes(year)) {
    notFound()
  }

  const currentYear = new Date().getFullYear()
  const isCurrentSeason = year === currentYear
  const yearIndex = availableYears.indexOf(year)
  const prevYear = yearIndex > 0 ? availableYears[yearIndex - 1] : null
  const nextYear = yearIndex < availableYears.length - 1 ? availableYears[yearIndex + 1] : null

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leagues">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Seasons
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h1 className="font-display text-4xl font-bold">{year} Season</h1>
              {isCurrentSeason && (
                <span className="px-2 py-1 text-xs font-semibold bg-yellow-500/20 text-yellow-600 rounded-full">
                  Current
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              Standings, records, and statistics from the {year} season
            </p>
          </div>
        </div>
        
        {/* Season navigation */}
        <div className="flex items-center gap-2">
          {prevYear && (
            <Link href={`/seasons/${prevYear}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
                {prevYear}
              </Button>
            </Link>
          )}
          {nextYear && (
            <Link href={`/seasons/${nextYear}`}>
              <Button variant="outline" size="sm">
                {nextYear}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Standings */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading standings...</p>
          </CardContent>
        </Card>
      }>
        <SeasonStandings year={year} />
      </Suspense>

      {/* Season Champion */}
      <Suspense fallback={null}>
        <SeasonChampion year={year} />
      </Suspense>

      {/* Season Records */}
      <Suspense fallback={null}>
        <SeasonRecords year={year} />
      </Suspense>

      {/* Weekly Scores Breakdown */}
      <Suspense fallback={null}>
        <WeeklyScoresBreakdown year={year} />
      </Suspense>

      {/* Head-to-Head Records */}
      <Suspense fallback={null}>
        <HeadToHeadRecords year={year} />
      </Suspense>

      {/* SDS+ Metrics */}
      <Suspense fallback={null}>
        <SDSPlusMetrics year={year} />
      </Suspense>

      {/* Team Performance Trends */}
      <Suspense fallback={null}>
        <PerformanceTrends year={year} />
      </Suspense>

      {/* Playoff Bracket */}
      <Suspense fallback={null}>
        <PlayoffBracket year={year} />
      </Suspense>
    </div>
  )
}
