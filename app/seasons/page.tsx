import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Season History",
  description: "Browse all Party Ponies fantasy football seasons from 2013 to present. See champions, standings, and PPSI scores for every year.",
  openGraph: {
    title: "Season History · Party Ponies",
    description: "13+ seasons of Party Ponies fantasy football. Champions, records, and PPSI scores for every year.",
  },
}
import { Badge } from "@/components/ui/badge"
import { getAllLeaguesWithMetadata } from "@/lib/league-utils"
import { getLeagueStandings } from "@/app/actions/yahoo-actions"
import Link from "next/link"
import { Trophy, Star, TrendingUp, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SeasonSummary {
  year: number
  league_key: string
  isCurrent: boolean
  champion: { owner: string; wins: number; losses: number; ties: number } | null
  topScorer: { owner: string; points: number } | null
  teamCount: number
}

async function buildSeasonSummaries(): Promise<SeasonSummary[]> {
  const leagues = await getAllLeaguesWithMetadata()
  if (leagues.length === 0) return []

  const currentYear = new Date().getFullYear()

  const results = await Promise.all(
    leagues.map(async (league) => {
      const year = parseInt(league.season) || 0
      const base: SeasonSummary = {
        year,
        league_key: league.league_key,
        isCurrent: year === currentYear,
        champion: null,
        topScorer: null,
        teamCount: 0,
      }

      try {
        const result = await getLeagueStandings(league.league_key)
        if (!result.success || !result.data) return base

        const standings = result.data
        base.teamCount = standings.length

        const champ = standings.find((t: { rank: number }) => t.rank === 1)
        if (champ) {
          base.champion = {
            owner: champ.owner_name || champ.name,
            wins: champ.wins,
            losses: champ.losses,
            ties: champ.ties,
          }
        }

        const topScoringTeam = [...standings].sort(
          (a: { points_for: number }, b: { points_for: number }) => b.points_for - a.points_for
        )[0]
        if (topScoringTeam) {
          base.topScorer = {
            owner: topScoringTeam.owner_name || topScoringTeam.name,
            points: topScoringTeam.points_for,
          }
        }
      } catch {
        // API unavailable — show season without details
      }

      return base
    })
  )

  return results.sort((a, b) => b.year - a.year)
}

function SeasonCard({ s }: { s: SeasonSummary }) {
  const champRecord = s.champion
    ? `${s.champion.wins}-${s.champion.losses}${s.champion.ties > 0 ? `-${s.champion.ties}` : ""}`
    : null

  // Top scorer is different from champion
  const topScorerDifferent =
    s.topScorer && s.champion && s.topScorer.owner !== s.champion.owner

  return (
    <Link href={`/seasons/${s.year}`}>
      <Card className={cn(
        "hover:border-primary transition-colors cursor-pointer h-full group",
        s.isCurrent && "border-primary/50 bg-primary/5"
      )}>
        <CardContent className="p-5 space-y-4">
          {/* Year + badge */}
          <div className="flex items-start justify-between">
            <div>
              <p className={cn(
                "font-display text-3xl font-black leading-none",
                s.isCurrent ? "text-primary" : "text-foreground"
              )}>
                {s.year}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.teamCount > 0 ? `${s.teamCount} teams` : "Season"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {s.isCurrent && (
                <Badge className="text-[10px] px-2 py-0.5 gap-1">
                  <Star className="h-2.5 w-2.5" />
                  Current
                </Badge>
              )}
            </div>
          </div>

          {/* Champion */}
          {s.champion ? (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Trophy className="h-3 w-3 text-yellow-500" />
                Champion
              </p>
              <p className="text-sm font-bold leading-tight">{s.champion.owner}</p>
              {champRecord && (
                <p className="text-xs text-muted-foreground font-mono">{champRecord}</p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Champion</p>
              <p className="text-sm text-muted-foreground italic">—</p>
            </div>
          )}

          {/* Top scorer (only when different from champion) */}
          {topScorerDifferent && s.topScorer && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Top Scorer
              </p>
              <p className="text-sm font-medium leading-tight">{s.topScorer.owner}</p>
              <p className="text-xs text-muted-foreground font-mono">{s.topScorer.points.toFixed(0)} pts</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              {s.isCurrent ? "View current season" : "View season"}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function SeasonsPage() {
  const seasons = await buildSeasonSummaries()

  if (seasons.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-4xl font-bold mb-4">Seasons</h1>
        <p className="text-muted-foreground">
          No seasons found. Make sure <code className="px-1 py-0.5 bg-muted rounded text-xs">NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS</code> is configured.
        </p>
      </div>
    )
  }

  const currentSeason = seasons.find(s => s.isCurrent)
  const pastSeasons = seasons.filter(s => !s.isCurrent)

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Seasons</h1>
        <p className="text-muted-foreground">
          {seasons.length} seasons of Party Ponies history. Click any card to see full standings, PPSI scores, and bracket.
        </p>
      </div>

      {/* Current season pinned at top */}
      {currentSeason && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Season</p>
          <div className="max-w-xs">
            <SeasonCard s={currentSeason} />
          </div>
        </section>
      )}

      {/* Past seasons */}
      <section className="space-y-3">
        {currentSeason && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Past Seasons</p>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pastSeasons.map(s => (
            <SeasonCard key={s.league_key} s={s} />
          ))}
        </div>
      </section>
    </div>
  )
}
