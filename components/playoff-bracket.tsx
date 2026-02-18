import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { YahooStanding } from "@/lib/yahoo-api"

interface PlayoffBracketProps {
  standings: YahooStanding[]
  year: number
}

export function PlayoffBracketComponent({ standings, year }: PlayoffBracketProps) {
  const isSixTeamPlayoff = year >= 2018
  const playoffTeams = isSixTeamPlayoff ? standings.slice(0, 6) : standings.slice(0, 4)

  if (isSixTeamPlayoff && playoffTeams.length < 6) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Playoff Bracket
          </CardTitle>
          <CardDescription>Playoff bracket for the {year} season</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Playoff bracket requires at least 6 teams. Currently {playoffTeams.length} teams available.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!isSixTeamPlayoff && playoffTeams.length < 4) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Playoff Bracket
          </CardTitle>
          <CardDescription>Playoff bracket for the {year} season</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Playoff bracket requires at least 4 teams. Currently {playoffTeams.length} teams available.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getTeamDisplay = (team: YahooStanding | undefined) => {
    if (!team) return null
    return (
      <>
        {team.owner_name || team.name}
        {team.owner_name && team.name && team.owner_name !== team.name && (
          <span className="text-xs text-muted-foreground font-normal ml-1">({team.name})</span>
        )}
      </>
    )
  }

  // Determine winners based on final rank
  const champion = playoffTeams.find(t => t.rank === 1)
  const runnerUp = playoffTeams.find(t => t.rank === 2)
  const thirdPlace = playoffTeams.find(t => t.rank === 3)

  // Seeds based on regular season finish (NOT final rank!)
  // Sort by regular season record: wins first, then points_for
  const sortedByRegularSeason = [...playoffTeams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.points_for - a.points_for
  })

  // Seeds based on regular season finish
  const seed1 = sortedByRegularSeason[0] // Best regular season record = Seed 1
  const seed2 = sortedByRegularSeason[1] // 2nd best regular season = Seed 2
  const seed3 = sortedByRegularSeason[2] // 3rd best regular season = Seed 3
  const seed4 = sortedByRegularSeason[3] // 4th best regular season = Seed 4

  if (isSixTeamPlayoff) {
    // 6-team bracket structure (2018+):
    // Round 1 (Quarterfinals): 3 vs 6, 4 vs 5 (top 2 seeds get byes)
    // Round 2 (Semifinals): 1 vs (4/5 winner), 2 vs (3/6 winner)
    // Round 3 (Final): Semifinal winners
    // 3rd Place Game: Semifinal losers

    const seed5 = playoffTeams[4] // 5th in standings = Seed 5
    const seed6 = playoffTeams[5] // 6th in standings = Seed 6

    // Determine quarterfinal winners based on final ranks
    const qf1Winner = (runnerUp && (runnerUp.team_key === seed4?.team_key || runnerUp.team_key === seed5?.team_key)) 
      ? runnerUp 
      : (thirdPlace && (thirdPlace.team_key === seed4?.team_key || thirdPlace.team_key === seed5?.team_key))
      ? thirdPlace
      : seed4
    
    const qf2Winner = (runnerUp && (runnerUp.team_key === seed3?.team_key || runnerUp.team_key === seed6?.team_key))
      ? runnerUp
      : (thirdPlace && (thirdPlace.team_key === seed3?.team_key || thirdPlace.team_key === seed6?.team_key))
      ? thirdPlace
      : seed3

    // Semifinal winners
    const semifinal1Winner = champion // Champion won semifinal 1
    const semifinal2Winner = runnerUp // Runner-up won semifinal 2

    // Determine 3rd place game participants (semifinal losers)
    const semifinal1Loser = semifinal1Winner?.team_key === seed1?.team_key ? qf1Winner : seed1
    const semifinal2Loser = semifinal2Winner?.team_key === seed2?.team_key ? qf2Winner : seed2

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Playoff Bracket - {year} Season
          </CardTitle>
          <CardDescription>6-team playoff bracket with top 2 seeds receiving byes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Round 1: Quarterfinals */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">Quarterfinals</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Matchup 1: Seed 3 vs Seed 6 */}
                <div className="space-y-2">
                  <div className={`p-3 border rounded-lg ${qf2Winner?.team_key === seed3?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        #{3} {getTeamDisplay(seed3)}
                      </span>
                      {qf2Winner?.team_key === seed3?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Winner</span>
                      )}
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">vs</div>
                  <div className={`p-3 border rounded-lg ${qf2Winner?.team_key === seed6?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        #{6} {getTeamDisplay(seed6)}
                      </span>
                      {qf2Winner?.team_key === seed6?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Winner</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Matchup 2: Seed 4 vs Seed 5 */}
                <div className="space-y-2">
                  <div className={`p-3 border rounded-lg ${qf1Winner?.team_key === seed4?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        #{4} {getTeamDisplay(seed4)}
                      </span>
                      {qf1Winner?.team_key === seed4?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Winner</span>
                      )}
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">vs</div>
                  <div className={`p-3 border rounded-lg ${qf1Winner?.team_key === seed5?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        #{5} {getTeamDisplay(seed5)}
                      </span>
                      {qf1Winner?.team_key === seed5?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Winner</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Round 2: Semifinals */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">Semifinals</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Semifinal 1: Seed 1 vs Quarterfinal Winner (4/5) */}
                <div className="space-y-2">
                  <div className={`p-3 border-2 rounded-lg ${semifinal1Winner?.team_key === seed1?.team_key ? 'border-green-500/50 bg-green-500/10' : 'border-primary/30 bg-primary/5'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        #{1} {getTeamDisplay(seed1)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-600 rounded">Bye</span>
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">vs</div>
                  <div className={`p-3 border rounded-lg ${semifinal1Winner?.team_key === qf1Winner?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {getTeamDisplay(qf1Winner)}
                      </span>
                      {semifinal1Winner?.team_key === qf1Winner?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Advanced</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Semifinal 2: Seed 2 vs Quarterfinal Winner (3/6) */}
                <div className="space-y-2">
                  <div className={`p-3 border-2 rounded-lg ${semifinal2Winner?.team_key === seed2?.team_key ? 'border-green-500/50 bg-green-500/10' : 'border-primary/30 bg-primary/5'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        #{2} {getTeamDisplay(seed2)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-600 rounded">Bye</span>
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">vs</div>
                  <div className={`p-3 border rounded-lg ${semifinal2Winner?.team_key === qf2Winner?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {getTeamDisplay(qf2Winner)}
                      </span>
                      {semifinal2Winner?.team_key === qf2Winner?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Advanced</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Round 3: Final */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">Final</h4>
              <div className="p-4 border-2 border-yellow-500/50 bg-yellow-500/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg">
                      {getTeamDisplay(champion)}
                    </span>
                    {champion && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Record: {champion.wins}-{champion.losses}
                        {champion.ties > 0 && `-${champion.ties}`}
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-600 rounded-full font-semibold">
                    🏆 Champion
                  </span>
                </div>
                {runnerUp && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Runner-Up: {getTeamDisplay(runnerUp)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Record: {runnerUp.wins}-{runnerUp.losses}
                        {runnerUp.ties > 0 && `-${runnerUp.ties}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3rd Place Game */}
            {thirdPlace && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm text-muted-foreground mb-3">3rd Place Game</h4>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {getTeamDisplay(thirdPlace)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-600 rounded-full font-semibold">
                      3rd Place
                    </span>
                  </div>
                  {semifinal1Loser && semifinal2Loser && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>{getTeamDisplay(semifinal1Loser)}</span>
                        <span>vs</span>
                        <span>{getTeamDisplay(semifinal2Loser)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  } else {
    // 4-team bracket structure (pre-2018):
    // Round 1 (Semifinals): 1 vs 4, 2 vs 3
    // Round 2 (Final): Semifinal winners

    // Determine semifinal winners
    const semifinal1Winner = champion // Champion won semifinal 1
    const semifinal2Winner = runnerUp // Runner-up won semifinal 2

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Playoff Bracket - {year} Season
          </CardTitle>
          <CardDescription>4-team playoff bracket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Round 1: Semifinals */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">Semifinals</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Semifinal 1: Seed 1 vs Seed 4 */}
                <div className="space-y-2">
                  <div className={`p-3 border rounded-lg ${semifinal1Winner?.team_key === seed1?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        #{1} {getTeamDisplay(seed1)}
                      </span>
                      {semifinal1Winner?.team_key === seed1?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Advanced</span>
                      )}
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">vs</div>
                  <div className={`p-3 border rounded-lg ${semifinal1Winner?.team_key === seed4?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        #{4} {getTeamDisplay(seed4)}
                      </span>
                      {semifinal1Winner?.team_key === seed4?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Advanced</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Semifinal 2: Seed 2 vs Seed 3 */}
                <div className="space-y-2">
                  <div className={`p-3 border rounded-lg ${semifinal2Winner?.team_key === seed2?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        #{2} {getTeamDisplay(seed2)}
                      </span>
                      {semifinal2Winner?.team_key === seed2?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Advanced</span>
                      )}
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">vs</div>
                  <div className={`p-3 border rounded-lg ${semifinal2Winner?.team_key === seed3?.team_key ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        #{3} {getTeamDisplay(seed3)}
                      </span>
                      {semifinal2Winner?.team_key === seed3?.team_key && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded font-semibold">✓ Advanced</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Round 2: Final */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">Final</h4>
              <div className="p-4 border-2 border-yellow-500/50 bg-yellow-500/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg">
                      {getTeamDisplay(champion)}
                    </span>
                    {champion && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Record: {champion.wins}-{champion.losses}
                        {champion.ties > 0 && `-${champion.ties}`}
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-600 rounded-full font-semibold">
                    🏆 Champion
                  </span>
                </div>
                {runnerUp && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Runner-Up: {getTeamDisplay(runnerUp)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Record: {runnerUp.wins}-{runnerUp.losses}
                        {runnerUp.ties > 0 && `-${runnerUp.ties}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
}
