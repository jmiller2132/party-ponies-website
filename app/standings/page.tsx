import { getLeagueStandings } from "@/app/actions/yahoo-actions"
import { getCurrentLeagueKey } from "@/lib/league-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trophy, Medal } from "lucide-react"
import { Suspense } from "react"
import Link from "next/link"

async function StandingsTable() {
  const leagueKey = await getCurrentLeagueKey()
  
  if (!leagueKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>League Key Required</CardTitle>
          <CardDescription>
            Unable to auto-detect league. Please configure your Yahoo League Key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            To get your league key:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Go to <Link href="/leagues" className="text-primary underline">/leagues</Link> (while signed in as commissioner)</li>
            <li>Copy your League Key</li>
            <li>Add it to your <code className="px-1 py-0.5 bg-muted rounded text-xs">.env.local</code> file as <code className="px-1 py-0.5 bg-muted rounded text-xs">NEXT_PUBLIC_YAHOO_LEAGUE_KEY</code></li>
            <li>Restart your dev server</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-4">
            Note: The commissioner needs to sign in once to enable auto-detection.
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
          {result.error?.includes("No tokens found") && (
            <p className="text-sm text-muted-foreground mt-2">
              The commissioner needs to sign in once to store authentication tokens.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Dedupe by team_key in case API/cache returns duplicates
  const seen = new Set<string>()
  const standings = result.data.filter((team: { team_key: string }) => {
    if (seen.has(team.team_key)) return false
    seen.add(team.team_key)
    return true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          League Standings
        </CardTitle>
        <CardDescription>
          Current season standings with points for and record
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">W-L-T</TableHead>
              <TableHead className="text-right">Points For</TableHead>
              <TableHead className="text-right">Points Against</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team, index) => (
              <TableRow key={team.team_key ? `${team.team_key}-${index}` : `row-${index}`}>
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
                  {team.owner_name && team.name !== team.owner_name && (
                    <span className="text-xs text-muted-foreground ml-2">({team.name})</span>
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

export default function StandingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Standings</h1>
        <p className="text-muted-foreground">
          Current league standings from Yahoo Fantasy Sports
        </p>
      </div>

      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading standings...</p>
          </CardContent>
        </Card>
      }>
        <StandingsTable />
      </Suspense>
    </div>
  )
}
