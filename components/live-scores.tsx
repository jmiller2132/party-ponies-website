"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Matchup {
  matchup_key: string
  week: number
  team1: {
    key: string
    name: string
    owner_name?: string
    points: number
  }
  team2: {
    key: string
    name: string
    owner_name?: string
    points: number
  }
  status: string
}

interface LiveScoresProps {
  matchups: Matchup[]
}

export function LiveScores({ matchups }: LiveScoresProps) {
  if (!matchups || matchups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Live Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No matchups available for this week.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="h-5 w-5 text-primary" />
          Week {matchups[0]?.week || "?"} - Live Scores
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Current matchups and scores
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {matchups.map((matchup) => {
            const team1Winning = matchup.team1.points > matchup.team2.points
            const team2Winning = matchup.team2.points > matchup.team1.points
            const isTie = matchup.team1.points === matchup.team2.points

            return (
              <div
                key={matchup.matchup_key}
                className="p-6 hover:bg-muted/30 transition-colors"
              >
                <div className="relative grid grid-cols-2 gap-4">
                  {/* Team 1 */}
                  <div
                    className={cn(
                      "flex flex-col p-4 rounded-lg border-2 transition-colors",
                      team1Winning && "border-primary bg-primary/5",
                      isTie && "border-border bg-muted/20",
                      !team1Winning && !isTie && "border-border"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">
                        {matchup.team1.owner_name || matchup.team1.name}
                      </span>
                      {team1Winning && (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                      {!team1Winning && !isTie && (
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-3xl font-bold",
                        team1Winning && "text-primary",
                        isTie && "text-foreground"
                      )}
                    >
                      {matchup.team1.points.toFixed(2)}
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center z-10">
                    <span className="px-3 py-1 rounded-full bg-background border-2 border-border text-muted-foreground font-semibold text-sm">
                      VS
                    </span>
                  </div>

                  {/* Team 2 */}
                  <div
                    className={cn(
                      "flex flex-col p-4 rounded-lg border-2 transition-colors",
                      team2Winning && "border-primary bg-primary/5",
                      isTie && "border-border bg-muted/20",
                      !team2Winning && !isTie && "border-border"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">
                        {matchup.team2.owner_name || matchup.team2.name}
                      </span>
                      {team2Winning && (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                      {!team2Winning && !isTie && (
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-3xl font-bold",
                        team2Winning && "text-primary",
                        isTie && "text-foreground"
                      )}
                    >
                      {matchup.team2.points.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {matchup.status || "In Progress"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
