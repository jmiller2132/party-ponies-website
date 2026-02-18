"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, TrendingUp, Trophy, Users, Loader2 } from "lucide-react"
import { getHeadToHeadRecord } from "@/app/actions/rivalry-actions"
import Link from "next/link"

interface RivalryComparisonProps {
  managers: string[]
}

export function RivalryComparison({ managers }: RivalryComparisonProps) {
  const [manager1, setManager1] = useState<string>("")
  const [manager2, setManager2] = useState<string>("")
  const [record, setRecord] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleCompare = () => {
    if (!manager1 || !manager2 || manager1 === manager2) {
      return
    }

    setIsLoading(true)
    startTransition(async () => {
      try {
        const result = await getHeadToHeadRecord(manager1, manager2)
        if (result.success) {
          setRecord(result.data)
        } else {
          setRecord(null)
        }
      } catch (error) {
        console.error("Error fetching head-to-head record:", error)
        setRecord(null)
      } finally {
        setIsLoading(false)
      }
    })
  }

  const winPct = record && record.total_games > 0
    ? ((record.wins / record.total_games) * 100).toFixed(1)
    : "0.0"

  const avgPointsFor = record && record.total_games > 0
    ? (record.points_for / record.total_games).toFixed(2)
    : "0.00"

  const avgPointsAgainst = record && record.total_games > 0
    ? (record.points_against / record.total_games).toFixed(2)
    : "0.00"

  const pointDiff = record
    ? (record.points_for - record.points_against).toFixed(2)
    : "0.00"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Head-to-Head Comparison
        </CardTitle>
        <CardDescription>
          Compare any two managers' head-to-head history across all seasons
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manager Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Manager 1</label>
            <Select value={manager1} onValueChange={setManager1}>
              <SelectTrigger>
                <SelectValue placeholder="Select manager..." />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem key={manager} value={manager}>
                    {manager}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Manager 2</label>
            <Select value={manager2} onValueChange={setManager2}>
              <SelectTrigger>
                <SelectValue placeholder="Select manager..." />
              </SelectTrigger>
              <SelectContent>
                {managers
                  .filter((m) => m !== manager1)
                  .map((manager) => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleCompare}
          disabled={!manager1 || !manager2 || manager1 === manager2 || isLoading || isPending}
          className="w-full"
        >
          {isLoading || isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              <Target className="h-4 w-4 mr-2" />
              Compare Managers
            </>
          )}
        </Button>

        {/* Results */}
        {record && (
          <div className="space-y-4 pt-4 border-t">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {manager1} vs {manager2}
              </h3>
              <div className="text-3xl font-bold mb-1">
                {record.wins}-{record.losses}-{record.ties}
              </div>
              <div className="text-sm text-muted-foreground">
                {record.wins > record.losses ? (
                  <span className="text-green-600 font-medium">{manager1} leads</span>
                ) : record.losses > record.wins ? (
                  <span className="text-red-600 font-medium">{manager2} leads</span>
                ) : (
                  <span className="text-muted-foreground">Tied</span>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Win %</div>
                <div className="text-2xl font-bold">{winPct}%</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total Games</div>
                <div className="text-2xl font-bold">{record.total_games}</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Point Differential</div>
                <div className={`text-2xl font-bold ${parseFloat(pointDiff) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(pointDiff) >= 0 ? '+' : ''}{pointDiff}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Points For</div>
                <div className="text-xl font-semibold">{record.points_for.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Avg: {avgPointsFor} per game
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Points Against</div>
                <div className="text-xl font-semibold">{record.points_against.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Avg: {avgPointsAgainst} per game
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/managers/${encodeURIComponent(manager1)}`}
                className="text-sm text-primary hover:underline"
              >
                View {manager1}'s profile →
              </Link>
              {" • "}
              <Link
                href={`/managers/${encodeURIComponent(manager2)}`}
                className="text-sm text-primary hover:underline"
              >
                View {manager2}'s profile →
              </Link>
            </div>
          </div>
        )}

        {record === null && !isLoading && !isPending && manager1 && manager2 && manager1 !== manager2 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No head-to-head record found between these managers.</p>
            <p className="text-sm mt-1">They may not have played in the same seasons.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
