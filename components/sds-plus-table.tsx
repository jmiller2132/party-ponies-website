"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trophy, Medal, Info, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { PPSIScore } from "@/lib/sds-plus"

type SortField =
  | 'year'
  | 'finalRank'
  | 'score'
  | 'dominance'
  | 'scoring'
  | 'scheduleLuck'
  | 'seasonResult'
type SortDirection = 'asc' | 'desc'

interface SDSPlusTableProps {
  scores: Array<PPSIScore & { year?: number; wins?: number; losses?: number; ties?: number; points_for?: number; points_against?: number }>
  defaultSort?: SortField
  defaultDirection?: SortDirection
  showYear?: boolean
  filters?: {
    year?: number
    owner?: string
    minSDS?: number
    maxSDS?: number
    minRank?: number
    maxRank?: number
  }
}

export function SDSPlusTable({
  scores,
  defaultSort = 'score',
  defaultDirection = 'desc',
  showYear = false,
  filters,
}: SDSPlusTableProps) {
  const [sortField, setSortField] = useState<SortField>(defaultSort)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)

  const filteredScores = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) return scores
    return scores.filter(score => {
      if (filters.year && (score as any).year !== filters.year) return false
      if (filters.owner && score.owner !== filters.owner) return false
      if (filters.minSDS !== undefined && score.score < filters.minSDS) return false
      if (filters.maxSDS !== undefined && score.score > filters.maxSDS) return false
      if (filters.minRank !== undefined && score.finalRank < filters.minRank) return false
      if (filters.maxRank !== undefined && score.finalRank > filters.maxRank) return false
      return true
    })
  }, [scores, filters])

  const sortedScores = useMemo(() => {
    return [...filteredScores].sort((a, b) => {
      let aValue: number
      let bValue: number
      switch (sortField) {
        case 'year':
          aValue = (a as any).year ?? 0
          bValue = (b as any).year ?? 0
          break
        case 'finalRank':
          aValue = a.finalRank
          bValue = b.finalRank
          break
        case 'score':
          aValue = a.score
          bValue = b.score
          break
        case 'dominance':
          aValue = a.breakdown.dominance
          bValue = b.breakdown.dominance
          break
        case 'scoring':
          aValue = a.breakdown.scoring
          bValue = b.breakdown.scoring
          break
        case 'scheduleLuck':
          aValue = a.breakdown.scheduleLuck
          bValue = b.breakdown.scheduleLuck
          break
        case 'seasonResult':
          aValue = a.breakdown.seasonResult
          bValue = b.breakdown.seasonResult
          break
        default:
          return 0
      }
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })
  }, [filteredScores, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'finalRank' ? 'asc' : 'desc')
    }
  }

  const SortButton = ({ field, label, tooltip }: { field: SortField; label: string; tooltip: string }) => {
    const isActive = sortField === field
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-medium hover:bg-transparent"
              onClick={() => handleSort(field)}
            >
              <div className="flex items-center gap-1">
                <span>{label}</span>
                {isActive ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
                <Info className="h-3 w-3 opacity-50" />
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const ppsiColor = (score: number) =>
    score >= 110
      ? 'text-yellow-600'
      : score >= 95
        ? 'text-blue-600'
        : score >= 80
          ? 'text-green-600'
          : score >= 65
            ? 'text-gray-600'
            : 'text-muted-foreground'

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showYear && (
            <TableHead className="w-20">
              <SortButton field="year" label="Year" tooltip="Season year" />
            </TableHead>
          )}
          <TableHead className="w-16">
            <SortButton
              field="finalRank"
              label="Finish"
              tooltip="Final playoff finish (1 = Champion)"
            />
          </TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">
            <SortButton
              field="score"
              label="PPSI"
              tooltip="Party Ponies Season Index — overall season quality score. 110+ = all-time great, 95–109 = elite, 80–94 = very good, 65–79 = solid, <65 = below average."
            />
          </TableHead>
          <TableHead className="text-right">
            <span className="font-medium text-sm">W-L-T</span>
          </TableHead>
          <TableHead className="text-right">
            <span className="font-medium text-sm">PF</span>
          </TableHead>
          <TableHead className="text-right">
            <span className="font-medium text-sm">PA</span>
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="dominance"
              label="DOM"
              tooltip="Dominance (0–50): All-Play Win% × 50. Measures how often you beat every other team each week. Completely schedule-neutral — your toughest rival can't inflate or deflate this."
            />
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="scoring"
              label="SCR"
              tooltip="Era-Adjusted Scoring (0–55+): Blend of points vs. league average (25 pts) and your within-season scoring percentile (25 pts). Compares fairly across years with different scoring totals."
            />
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="scheduleLuck"
              label="LUCK"
              tooltip="Schedule Luck Adjustment (±7): (APW − actual win%) × 15. Positive = your dominance outpaced your record (unlucky schedule). Negative = your record outpaced your dominance (easy draws)."
            />
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="seasonResult"
              label="RESULT"
              tooltip="Season Result (0–30): Champion = 30, Runner-up = 18, 3rd = 10, 4th = 4, missed playoffs = 0."
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedScores.map(score => (
          <TableRow key={`${(score as any).year ?? ''}-${score.team_key}`}>
            {showYear && (
              <TableCell className="font-medium">{(score as any).year ?? '—'}</TableCell>
            )}
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                {score.finalRank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                {score.finalRank === 2 && <Medal className="h-4 w-4 text-gray-400" />}
                {score.finalRank === 3 && <Medal className="h-4 w-4 text-amber-600" />}
                <span>{score.finalRank}</span>
              </div>
            </TableCell>
            <TableCell className="font-semibold">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{score.owner}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{score.interpretation}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            <TableCell className="text-right font-bold">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn('text-lg cursor-help', ppsiColor(score.score))}>
                      {score.score.toFixed(1)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{score.interpretation}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            <TableCell className="text-right">
              {score.wins !== undefined && score.losses !== undefined
                ? `${score.wins}-${score.losses}-${score.ties ?? 0}`
                : '—'}
            </TableCell>
            <TableCell className="text-right font-medium">
              {score.points_for !== undefined && score.points_for > 0
                ? score.points_for.toFixed(2)
                : '—'}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {score.points_against !== undefined && score.points_against > 0
                ? score.points_against.toFixed(2)
                : '—'}
            </TableCell>
            <TableCell className="text-right">
              {score.breakdown.dominance.toFixed(1)}
            </TableCell>
            <TableCell className="text-right">
              {score.breakdown.scoring.toFixed(1)}
            </TableCell>
            <TableCell
              className={cn(
                'text-right',
                score.breakdown.scheduleLuck > 0.5
                  ? 'text-blue-600'
                  : score.breakdown.scheduleLuck < -0.5
                    ? 'text-orange-600'
                    : 'text-muted-foreground',
              )}
            >
              {score.breakdown.scheduleLuck > 0 ? '+' : ''}
              {score.breakdown.scheduleLuck.toFixed(1)}
            </TableCell>
            <TableCell className="text-right font-medium">
              {score.breakdown.seasonResult > 0 ? (
                <span className="text-green-700">+{score.breakdown.seasonResult}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
