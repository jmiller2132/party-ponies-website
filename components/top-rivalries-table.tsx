"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { TopRivalry } from "@/lib/rivalry-utils"

interface TopRivalriesTableProps {
  rivalries: TopRivalry[]
  title?: string
  description?: string
}

type SortField = "competitiveness" | "games" | "record" | "pointDiff" | "rivalry"
type SortDirection = "asc" | "desc"

export function TopRivalriesTable({ rivalries, title = "Top Rivalries", description }: TopRivalriesTableProps) {
  const [sortField, setSortField] = useState<SortField>("competitiveness")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const sortedRivalries = useMemo(() => {
    const sorted = [...rivalries].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "competitiveness":
          comparison = a.competitiveness_score - b.competitiveness_score
          break
        case "games":
          comparison = a.total_games - b.total_games
          break
        case "record":
          // Sort by win percentage (wins / total_games)
          const aWinPct = a.total_games > 0 ? a.wins / a.total_games : 0
          const bWinPct = b.total_games > 0 ? b.wins / b.total_games : 0
          comparison = aWinPct - bWinPct
          break
        case "pointDiff":
          comparison = (a.points_for - a.points_against) - (b.points_for - b.points_against)
          break
        case "rivalry":
          comparison = `${a.manager1} vs ${a.manager2}`.localeCompare(`${b.manager1} vs ${b.manager2}`)
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [rivalries, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    )
  }

  if (rivalries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No rivalries found. Managers need to have played against each other.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("rivalry")}
                >
                  Rivalry
                  <SortIcon field="rivalry" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("record")}
                >
                  Record
                  <SortIcon field="record" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("games")}
                >
                  Games
                  <SortIcon field="games" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("pointDiff")}
                >
                  Point Diff
                  <SortIcon field="pointDiff" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("competitiveness")}
                >
                  Competitiveness
                  <SortIcon field="competitiveness" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRivalries.map((rivalry, index) => {
              const winPct = rivalry.total_games > 0
                ? ((rivalry.wins / rivalry.total_games) * 100).toFixed(1)
                : "0.0"
              const pointDiff = (rivalry.points_for - rivalry.points_against).toFixed(2)
              const competitivenessPct = (rivalry.competitiveness_score * 100).toFixed(0)

              return (
                <TableRow key={`${rivalry.manager1}-${rivalry.manager2}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <div>
                        <Link
                          href={`/managers/${encodeURIComponent(rivalry.manager1)}`}
                          className="font-medium hover:text-primary"
                        >
                          {rivalry.manager1}
                        </Link>
                        <span className="mx-2 text-muted-foreground">vs</span>
                        <Link
                          href={`/managers/${encodeURIComponent(rivalry.manager2)}`}
                          className="font-medium hover:text-primary"
                        >
                          {rivalry.manager2}
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {rivalry.wins}-{rivalry.losses}-{rivalry.ties}
                    </div>
                    <div className="text-xs text-muted-foreground">{winPct}%</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {rivalry.total_games}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={parseFloat(pointDiff) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {parseFloat(pointDiff) >= 0 ? '+' : ''}{pointDiff}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${rivalry.competitiveness_score * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10">{competitivenessPct}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
