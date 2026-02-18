import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllLeaguesWithMetadata } from "@/lib/league-utils"
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

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {leagues.map((league) => {
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isCurrentSeason ? 'Current Season' : 'View Season'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
