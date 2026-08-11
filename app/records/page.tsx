import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "All-Time Records",
  description: "Championship history, most wins, highest scoring seasons, and the hall of shame. Every Party Ponies record from 2013 to present.",
  openGraph: {
    title: "All-Time Records · Party Ponies",
    description: "13 years of champions, career records, highest scoring seasons, and the most embarrassing finishes in league history.",
  },
}
import { Trophy, Award, TrendingUp, TrendingDown, Skull, Sparkles, Medal } from "lucide-react"
import { getAllLeaguesWithMetadata } from "@/lib/league-utils"
import { getLeagueStandings } from "@/app/actions/yahoo-actions"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// ─── Data fetching ────────────────────────────────────────────────────────────

interface TeamSeason {
  year: number
  owner: string
  rank: number
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  games: number
  winPct: number
}

async function getAllSeasonData() {
  const leagues = await getAllLeaguesWithMetadata()

  const standingsResults = await Promise.all(
    leagues.map(async (league) => {
      const year = parseInt(league.season)
      if (!year) return null
      const result = await getLeagueStandings(league.league_key)
      if (!result.success || !result.data) return null
      return { year, standings: result.data }
    })
  )

  const seasons = standingsResults
    .filter((r): r is { year: number; standings: NonNullable<typeof standingsResults[0]>['standings'] } => r !== null)
    .sort((a, b) => b.year - a.year)

  const allTeamSeasons: TeamSeason[] = seasons.flatMap(({ year, standings }) =>
    standings.map(team => {
      const games = team.wins + team.losses + team.ties
      return {
        year,
        owner: team.owner_name || team.name,
        rank: team.rank,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        points_for: team.points_for,
        points_against: team.points_against,
        games,
        winPct: games > 0 ? team.wins / games : 0,
      }
    })
  )

  // Champions list
  const champions = seasons
    .map(({ year, standings }) => {
      const champ = standings.find(t => t.rank === 1)
      return champ ? { year, owner: champ.owner_name || champ.name, points: champ.points_for } : null
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  // Championship counts
  const champCounts = new Map<string, number>()
  champions.forEach(c => champCounts.set(c.owner, (champCounts.get(c.owner) ?? 0) + 1))
  const mostChamps = Array.from(champCounts.entries())
    .sort((a, b) => b[1] - a[1])

  // Season scoring records (min 10 games to qualify)
  const qualified = allTeamSeasons.filter(t => t.games >= 10)

  const topPF = [...qualified].sort((a, b) => b.points_for - a.points_for).slice(0, 5)
  const lowestPF = [...qualified].sort((a, b) => a.points_for - b.points_for).slice(0, 3)
  const bestRecord = [...qualified].sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct
    return b.wins - a.wins
  }).slice(0, 5)
  const worstRecord = [...qualified].sort((a, b) => {
    if (a.winPct !== b.winPct) return a.winPct - b.winPct
    return a.wins - b.wins
  }).slice(0, 3)

  // Career totals (from allTeamSeasons)
  const careerMap = new Map<string, { wins: number; losses: number; ties: number; pf: number; seasons: number; champs: number }>()
  allTeamSeasons.forEach(t => {
    const prev = careerMap.get(t.owner) ?? { wins: 0, losses: 0, ties: 0, pf: 0, seasons: 0, champs: 0 }
    careerMap.set(t.owner, {
      wins: prev.wins + t.wins,
      losses: prev.losses + t.losses,
      ties: prev.ties + t.ties,
      pf: prev.pf + t.points_for,
      seasons: prev.seasons + 1,
      champs: prev.champs + (t.rank === 1 ? 1 : 0),
    })
  })

  const careerStats = Array.from(careerMap.entries()).map(([owner, s]) => {
    const games = s.wins + s.losses + s.ties
    return { owner, ...s, games, careerWinPct: games > 0 ? s.wins / games : 0 }
  })

  const mostCareerWins = [...careerStats].sort((a, b) => b.wins - a.wins).slice(0, 5)
  const bestCareerWinPct = [...careerStats]
    .filter(c => c.seasons >= 3)
    .sort((a, b) => b.careerWinPct - a.careerWinPct)
    .slice(0, 5)
  const mostCareerPF = [...careerStats].sort((a, b) => b.pf - a.pf).slice(0, 5)

  return {
    seasons: seasons.length,
    champions,
    mostChamps,
    topPF,
    lowestPF,
    bestRecord,
    worstRecord,
    mostCareerWins,
    bestCareerWinPct,
    mostCareerPF,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecordRow({
  rank,
  label,
  value,
  sub,
  highlight = false,
}: {
  rank: number
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      "flex items-center justify-between py-2 border-b border-border/50 last:border-0",
      highlight && "font-semibold"
    )}>
      <div className="flex items-center gap-3">
        <span className={cn(
          "text-sm w-6 text-center",
          rank === 1 ? "text-yellow-500 font-bold" : "text-muted-foreground"
        )}>
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`}
        </span>
        <div>
          <p className={cn("text-sm", highlight && "font-bold")}>{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
      <span className={cn("text-sm font-mono", highlight && "text-primary font-bold text-base")}>
        {value}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RecordsPage() {
  const data = await getAllSeasonData()

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">All-Time Records</h1>
        <p className="text-muted-foreground">
          {data.seasons} seasons of Party Ponies history — {new Date().getFullYear() - 2013 + 1} years of glory, heartbreak, and questionable roster decisions.
        </p>
      </div>

      {/* Championship Roll */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Championship Roll
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {data.champions.map(({ year, owner, points }) => (
            <Link key={year} href={`/seasons/${year}`}>
              <div className="p-4 rounded-lg border border-border hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-colors text-center cursor-pointer group">
                <p className="text-2xl font-black text-muted-foreground group-hover:text-foreground transition-colors">{year}</p>
                <Trophy className="h-4 w-4 text-yellow-500 mx-auto my-1" />
                <p className="text-sm font-semibold leading-tight">{owner}</p>
                <p className="text-xs text-muted-foreground mt-1">{points.toFixed(0)} pts</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Career Records */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          Career Records
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Most Championships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.mostChamps.slice(0, 5).map(([owner, count], i) => (
                <RecordRow
                  key={owner}
                  rank={i + 1}
                  label={owner}
                  value={`${count} 🏆`}
                  highlight={i === 0}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Most Career Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.mostCareerWins.map((c, i) => (
                <RecordRow
                  key={c.owner}
                  rank={i + 1}
                  label={c.owner}
                  value={`${c.wins}W`}
                  sub={`${c.seasons} seasons`}
                  highlight={i === 0}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Best Career Win %
              </CardTitle>
              <CardDescription className="text-xs">Min 3 seasons</CardDescription>
            </CardHeader>
            <CardContent>
              {data.bestCareerWinPct.map((c, i) => (
                <RecordRow
                  key={c.owner}
                  rank={i + 1}
                  label={c.owner}
                  value={`${(c.careerWinPct * 100).toFixed(1)}%`}
                  sub={`${c.wins}-${c.losses}${c.ties > 0 ? `-${c.ties}` : ''}`}
                  highlight={i === 0}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Most Career Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.mostCareerPF.map((c, i) => (
                <RecordRow
                  key={c.owner}
                  rank={i + 1}
                  label={c.owner}
                  value={c.pf.toFixed(0)}
                  sub={`${c.seasons} seasons`}
                  highlight={i === 0}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Season Records */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
          <Medal className="h-6 w-6 text-primary" />
          Single-Season Records
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Most Points In a Season
              </CardTitle>
              <CardDescription className="text-xs">Highest season totals ever recorded</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topPF.map((t, i) => (
                <RecordRow
                  key={`${t.year}-${t.owner}`}
                  rank={i + 1}
                  label={t.owner}
                  value={t.points_for.toFixed(2)}
                  sub={`${t.year} — Rank ${t.rank} finish`}
                  highlight={i === 0}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Best Single-Season Record
              </CardTitle>
              <CardDescription className="text-xs">Highest win % in a single season</CardDescription>
            </CardHeader>
            <CardContent>
              {data.bestRecord.map((t, i) => (
                <RecordRow
                  key={`${t.year}-${t.owner}`}
                  rank={i + 1}
                  label={t.owner}
                  value={`${(t.winPct * 100).toFixed(1)}%`}
                  sub={`${t.year} — ${t.wins}-${t.losses}${t.ties > 0 ? `-${t.ties}` : ''}`}
                  highlight={i === 0}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Skull className="h-4 w-4 text-destructive" />
                Lowest Points In a Season
              </CardTitle>
              <CardDescription className="text-xs">The cursed hall of shame</CardDescription>
            </CardHeader>
            <CardContent>
              {data.lowestPF.map((t, i) => (
                <RecordRow
                  key={`${t.year}-${t.owner}`}
                  rank={i + 1}
                  label={t.owner}
                  value={t.points_for.toFixed(2)}
                  sub={`${t.year} — ${t.wins}-${t.losses} record`}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Worst Single-Season Record
              </CardTitle>
              <CardDescription className="text-xs">Remembering so we don't repeat</CardDescription>
            </CardHeader>
            <CardContent>
              {data.worstRecord.map((t, i) => (
                <RecordRow
                  key={`${t.year}-${t.owner}`}
                  rank={i + 1}
                  label={t.owner}
                  value={`${(t.winPct * 100).toFixed(1)}%`}
                  sub={`${t.year} — ${t.wins}-${t.losses}${t.ties > 0 ? `-${t.ties}` : ''}`}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PPSI Hall of Fame CTA */}
      <section className="border border-primary/30 rounded-xl p-6 bg-primary/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-primary" />
              PPSI Season Comparison
            </h2>
            <p className="text-sm text-muted-foreground">
              See every season ranked by PPSI — the Party Ponies Season Index. Who had the best season in league history?
            </p>
          </div>
          <Link href="/seasons/compare">
            <Button className="shrink-0">View All Seasons →</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
