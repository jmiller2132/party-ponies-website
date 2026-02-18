import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Award, TrendingUp, BarChart3, Clock } from "lucide-react"
import { getAllLeaguesWithMetadata } from "@/lib/league-utils"
import { Badge } from "@/components/ui/badge"

export default async function RecordsPage() {
  // Get all leagues across all years for historical records
  const allLeagues = await getAllLeaguesWithMetadata()
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-4xl font-bold">All-Time Records</h1>
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3 w-3" />
            Coming Soon
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Historical records and achievements across all seasons ({allLeagues.length} {allLeagues.length === 1 ? 'season' : 'seasons'} available)
        </p>
        <p className="text-sm text-muted-foreground mt-2 italic">
          Pulling obscure and oddly specific records like Yahoo's recordbook - highest single-week scores, biggest blowouts, longest win streaks, and more.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Championship Records
            </CardTitle>
            <CardDescription>
              Past champions and championship history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Historical championship records will be displayed here once data is synced from Yahoo Fantasy Sports.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Single Season Records
            </CardTitle>
            <CardDescription>
              Best single-season performances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Records for most points in a season, best win-loss record, and other single-season achievements.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              All-Time Statistics
            </CardTitle>
            <CardDescription>
              Career totals and averages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              All-time points for, all-time wins, and other cumulative statistics preserved in our Supabase database.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Week Records
            </CardTitle>
            <CardDescription>
              Highest single-week scores and performances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Records for highest single-week scores, biggest blowouts, and other weekly achievements.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
