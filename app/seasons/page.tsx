import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllLeaguesWithMetadata } from "@/lib/league-utils"
import { getLeagueStandings } from "@/app/actions/yahoo-actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Trophy, Calendar, ArrowRight } from "lucide-react"

async function SeasonsList() {
  // Get all seasons (leagues) - works without authentication
  const leagues = await getAllLeaguesWithMetadata()

  if (leagues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Seasons Found</CardTitle>
          <CardDescription>Unable to load season data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Make sure NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS is configured in your .env.local file.
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentYear = new Date().getFullYear()

  // Fetch standings for all leagues in parallel; each promise catches so token/API failures don't break the page
  const standingsPromises = leagues.map(async (league) => {
    try {
      const result = await getLeagueStandings(league.league_key)
      if (result.success && result.data) {
        const champion = result.data.find((team: { rank: number }) => team.rank === 1)
        return {
          league,
          champion: champion ? { owner: champion.owner_name || champion.name, team: champion.name } : null,
        }
      }
    } catch {
      // e.g. invalid refresh token — show season without champion; user can re-sign in to fix
    }
    return { league, champion: null }
  })

  const seasonsWithChampions = await Promise.all(standingsPromises)

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {seasonsWithChampions.map(({ league, champion }) => {
        const season = parseInt(league.season) || 0
        const isCurrentSeason = season === currentYear
        
        return (
          <Link key={league.league_key} href={`/seasons/${season}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {isCurrentSeason && <Trophy className="h-5 w-5 text-yellow-500" />}
                      <span>{season} Season</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {league.name || 'Party Ponies'}
                    </CardDescription>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {champion && (
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold text-foreground">Champion:</span>
                      </div>
                      <div className="ml-6">
                        <span className="font-medium">{champion.owner}</span>
                        {champion.owner !== champion.team && (
                          <span className="text-xs text-muted-foreground ml-1">({champion.team})</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isCurrentSeason ? 'Current Season' : 'View Season'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export default function SeasonsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Seasons</h1>
        <p className="text-muted-foreground">
          Browse league history by season. Click on any season to view standings, records, and more.
        </p>
      </div>

      <SeasonsList />
    </div>
  )
}
