import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { YahooStanding } from "@/lib/yahoo-api"
import { cn } from "@/lib/utils"

interface PlayoffBracketProps {
  standings: YahooStanding[]
  year: number
}

function teamLabel(team: YahooStanding | undefined) {
  if (!team) return null
  const name = team.owner_name || team.name
  const showTeam = team.name && team.name !== name
  return (
    <span>
      {name}
      {showTeam && <span className="text-xs text-muted-foreground font-normal ml-1">({team.name})</span>}
    </span>
  )
}

function MatchupSlot({
  seed,
  team,
  won,
  bye,
}: {
  seed: number
  team: YahooStanding | undefined
  won: boolean
  bye?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        won ? "bg-green-500/10 border-green-500/40 font-semibold" : "bg-muted/40 border-border/60",
        bye && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-muted-foreground tabular-nums w-4 shrink-0">#{seed}</span>
        <span className="text-sm truncate">{teamLabel(team)}</span>
      </div>
      {bye && (
        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded shrink-0">Bye</span>
      )}
      {won && !bye && (
        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded shrink-0">✓</span>
      )}
    </div>
  )
}

function RoundLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{children}</p>
  )
}

function VsDivider() {
  return <p className="text-center text-xs text-muted-foreground">vs</p>
}

export function PlayoffBracketComponent({ standings, year }: PlayoffBracketProps) {
  const isSixTeam = year >= 2018

  // Sort by final rank to get the playoff participants
  const sorted = [...standings].sort((a, b) => a.rank - b.rank)
  const playoffTeams = isSixTeam ? sorted.slice(0, 6) : sorted.slice(0, 4)

  if ((isSixTeam && playoffTeams.length < 6) || (!isSixTeam && playoffTeams.length < 4)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Playoff Bracket — {year} Season
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Not enough data to render the bracket.</p>
        </CardContent>
      </Card>
    )
  }

  // Seed by regular season performance (wins → PF tiebreak)
  const byRegSeason = [...playoffTeams].sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : b.points_for - a.points_for
  )

  const [s1, s2, s3, s4, s5, s6] = byRegSeason

  // Helper: lower final rank = better result = winner of their matchup
  const winner = (a: YahooStanding | undefined, b: YahooStanding | undefined) =>
    (a?.rank ?? 999) < (b?.rank ?? 999) ? a : b
  const loser = (a: YahooStanding | undefined, b: YahooStanding | undefined) =>
    (a?.rank ?? 999) > (b?.rank ?? 999) ? a : b

  const champion = sorted[0]  // rank 1
  const runnerUp  = sorted[1] // rank 2
  const third     = sorted[2] // rank 3

  if (isSixTeam) {
    // QF: seed4 vs seed5, seed3 vs seed6
    const qf45Winner = winner(s4, s5)
    const qf45Loser  = loser(s4, s5)
    const qf36Winner = winner(s3, s6)
    const qf36Loser  = loser(s3, s6)

    // SF: seed1 plays QF(3v6) winner, seed2 plays QF(4v5) winner
    const sf1Winner = winner(s1, qf36Winner)
    const sf1Loser  = loser(s1, qf36Winner)
    const sf2Winner = winner(s2, qf45Winner)
    const sf2Loser  = loser(s2, qf45Winner)

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Playoff Bracket — {year} Season
          </CardTitle>
          <CardDescription>6-team playoff · top 2 seeds received first-round byes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Column 1: Quarterfinals */}
            <div className="space-y-4">
              <RoundLabel>Quarterfinals</RoundLabel>

              {/* Seed 1 bye */}
              <div className="space-y-1">
                <MatchupSlot seed={1} team={s1} won={false} bye />
              </div>

              {/* 4 vs 5 */}
              <div className="space-y-1">
                <MatchupSlot seed={4} team={s4} won={qf45Winner?.team_key === s4?.team_key} />
                <VsDivider />
                <MatchupSlot seed={5} team={s5} won={qf45Winner?.team_key === s5?.team_key} />
              </div>

              {/* 3 vs 6 */}
              <div className="space-y-1">
                <MatchupSlot seed={3} team={s3} won={qf36Winner?.team_key === s3?.team_key} />
                <VsDivider />
                <MatchupSlot seed={6} team={s6} won={qf36Winner?.team_key === s6?.team_key} />
              </div>

              {/* Seed 2 bye */}
              <div className="space-y-1">
                <MatchupSlot seed={2} team={s2} won={false} bye />
              </div>
            </div>

            {/* Column 2: Semifinals */}
            <div className="space-y-4">
              <RoundLabel>Semifinals</RoundLabel>

              {/* SF1: seed1 vs qf36Winner */}
              <div className="space-y-1">
                <MatchupSlot
                  seed={byRegSeason.indexOf(s1) + 1}
                  team={s1}
                  won={sf1Winner?.team_key === s1?.team_key}
                />
                <VsDivider />
                <MatchupSlot
                  seed={byRegSeason.indexOf(qf36Winner!) + 1}
                  team={qf36Winner}
                  won={sf1Winner?.team_key === qf36Winner?.team_key}
                />
              </div>

              {/* SF2: seed2 vs qf45Winner */}
              <div className="space-y-1 mt-6">
                <MatchupSlot
                  seed={byRegSeason.indexOf(s2) + 1}
                  team={s2}
                  won={sf2Winner?.team_key === s2?.team_key}
                />
                <VsDivider />
                <MatchupSlot
                  seed={byRegSeason.indexOf(qf45Winner!) + 1}
                  team={qf45Winner}
                  won={sf2Winner?.team_key === qf45Winner?.team_key}
                />
              </div>
            </div>

            {/* Column 3: Final + 3rd/5th */}
            <div className="space-y-4">
              <RoundLabel>Final</RoundLabel>
              <div className="p-4 border-2 border-yellow-500/40 bg-yellow-500/5 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{teamLabel(champion)}</span>
                  <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded-full font-semibold shrink-0">
                    🏆 Champion
                  </span>
                </div>
                <div className="pt-2 border-t border-yellow-500/20 text-sm text-muted-foreground flex items-center justify-between">
                  <span>Runner-up: {teamLabel(runnerUp)}</span>
                </div>
              </div>

              <RoundLabel>3rd Place</RoundLabel>
              <div className="space-y-1">
                <MatchupSlot
                  seed={byRegSeason.indexOf(sf1Loser!) + 1}
                  team={sf1Loser}
                  won={third?.team_key === sf1Loser?.team_key}
                />
                <VsDivider />
                <MatchupSlot
                  seed={byRegSeason.indexOf(sf2Loser!) + 1}
                  team={sf2Loser}
                  won={third?.team_key === sf2Loser?.team_key}
                />
              </div>

              <RoundLabel>5th Place</RoundLabel>
              <div className="space-y-1">
                <MatchupSlot
                  seed={byRegSeason.indexOf(qf36Loser!) + 1}
                  team={qf36Loser}
                  won={(qf36Loser?.rank ?? 999) < (qf45Loser?.rank ?? 999)}
                />
                <VsDivider />
                <MatchupSlot
                  seed={byRegSeason.indexOf(qf45Loser!) + 1}
                  team={qf45Loser}
                  won={(qf45Loser?.rank ?? 999) < (qf36Loser?.rank ?? 999)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── 4-team bracket (pre-2018) ──────────────────────────────────────────────
  // SF1: seed1 vs seed4, SF2: seed2 vs seed3
  const sf1Winner4 = winner(s1, s4)
  const sf2Winner4 = winner(s2, s3)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Playoff Bracket — {year} Season
        </CardTitle>
        <CardDescription>4-team playoff bracket</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Semifinals */}
          <div className="space-y-4">
            <RoundLabel>Semifinals</RoundLabel>

            <div className="space-y-1">
              <MatchupSlot seed={1} team={s1} won={sf1Winner4?.team_key === s1?.team_key} />
              <VsDivider />
              <MatchupSlot seed={4} team={s4} won={sf1Winner4?.team_key === s4?.team_key} />
            </div>

            <div className="space-y-1">
              <MatchupSlot seed={2} team={s2} won={sf2Winner4?.team_key === s2?.team_key} />
              <VsDivider />
              <MatchupSlot seed={3} team={s3} won={sf2Winner4?.team_key === s3?.team_key} />
            </div>
          </div>

          {/* Final */}
          <div className="space-y-4">
            <RoundLabel>Final</RoundLabel>
            <div className="p-4 border-2 border-yellow-500/40 bg-yellow-500/5 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold">{teamLabel(champion)}</span>
                <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded-full font-semibold shrink-0">
                  🏆 Champion
                </span>
              </div>
              <div className="pt-2 border-t border-yellow-500/20 text-sm text-muted-foreground">
                Runner-up: {teamLabel(runnerUp)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
