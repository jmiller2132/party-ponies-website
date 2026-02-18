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
import { SDSPlusScore } from "@/lib/sds-plus"

type SortField = 'year' | 'finalRank' | 'score' | 'pfIndexEra' | 'allPlayWinPct' | 'regularSeasonScore' | 'weeklyCeilingRate' | 'strengthOfSchedule' | 'consistencyIndex' | 'postseasonBonus' | 'playoffLuckDiff'
type SortDirection = 'asc' | 'desc'

interface SDSPlusTableProps {
  scores: Array<SDSPlusScore & { year?: number; wins?: number; losses?: number; ties?: number; points_for?: number; points_against?: number }>
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
  hasWeeklyScores?: boolean
}

export function SDSPlusTable({ scores, defaultSort = 'finalRank', defaultDirection = 'asc', showYear = false, filters, hasWeeklyScores = true }: SDSPlusTableProps) {
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
    const sorted = [...filteredScores].sort((a, b) => {
      let aValue: number
      let bValue: number

      switch (sortField) {
        case 'year':
          aValue = (a as any).year || 0
          bValue = (b as any).year || 0
          break
        case 'finalRank':
          aValue = a.finalRank
          bValue = b.finalRank
          break
        case 'score':
          aValue = a.score
          bValue = b.score
          break
        case 'pfIndexEra':
          aValue = a.breakdown.pfIndexEra
          bValue = b.breakdown.pfIndexEra
          break
        case 'allPlayWinPct':
          aValue = a.breakdown.allPlayWinPct
          bValue = b.breakdown.allPlayWinPct
          break
        case 'regularSeasonScore':
          aValue = a.breakdown.regularSeasonScore
          bValue = b.breakdown.regularSeasonScore
          break
        case 'weeklyCeilingRate':
          aValue = a.breakdown.weeklyCeilingRate
          bValue = b.breakdown.weeklyCeilingRate
          break
        case 'strengthOfSchedule':
          aValue = a.breakdown.strengthOfSchedule
          bValue = b.breakdown.strengthOfSchedule
          break
        case 'consistencyIndex':
          aValue = a.breakdown.consistencyIndex
          bValue = b.breakdown.consistencyIndex
          break
        case 'postseasonBonus':
          aValue = a.breakdown.postseasonBonus
          bValue = b.breakdown.postseasonBonus
          break
        case 'playoffLuckDiff':
          aValue = a.breakdown.playoffLuckDiff
          bValue = b.breakdown.playoffLuckDiff
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    return sorted
  }, [filteredScores, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showYear && (
            <TableHead className="w-20">
              <SortButton
                field="year"
                label="Year"
                tooltip="Season year"
              />
            </TableHead>
          )}
          <TableHead className="w-16">
            <SortButton
              field="finalRank"
              label="Rank"
              tooltip="Final playoff finish position (1 = Champion)"
            />
          </TableHead>
          <TableHead>Owner</TableHead>
          <TableHead className="text-right">
            <SortButton
              field="score"
              label="SDS+"
              tooltip="Season Dominance Score Plus - Overall luck-adjusted dominance metric (95+ = all-time season, 85-94 = dominant, 75-84 = elite, 65-74 = solid, <65 = average)"
            />
          </TableHead>
          <TableHead className="text-right">
            <span className="font-medium">W-L-T</span>
          </TableHead>
          <TableHead className="text-right">
            <span className="font-medium">PF</span>
          </TableHead>
          <TableHead className="text-right">
            <span className="font-medium">PA</span>
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="pfIndexEra"
              label="PFI Era"
              tooltip="PFI Era: Era-Adjusted Points Index - Combines points index (PF/league avg) with percentile rank to normalize across seasons"
            />
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="allPlayWinPct"
              label="APW"
              tooltip="APW: All-Play Win Percentage - Win rate if you played every team every week (0-1 scale)"
            />
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="regularSeasonScore"
              label="RSS"
              tooltip="RSS: Regular Season Score - Normalized score based on regular season rank. Formula: 1 - (rank-1)/(teams-1). Best record = 1.00, worst = 0.00"
            />
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="weeklyCeilingRate"
              label="WCR"
              tooltip="WCR: Weekly Ceiling Rate - Highest weekly score normalized by league average"
            />
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="strengthOfSchedule"
              label="SoS"
              tooltip="SoS: Strength of Schedule - Measures opponent difficulty based on actual opponents faced. Formula: 1 + (avg opponent APW - 0.50). 1.0 = average schedule, >1.0 = harder (faced better teams), <1.0 = easier (faced worse teams). Multiplies entire base score."
            />
          </TableHead>
              {hasWeeklyScores && (
                <TableHead className="text-right">
                  <SortButton
                    field="consistencyIndex"
                    label="CI"
                    tooltip="CI: Consistency Index - Only calculated when weekly scores are available. Measures scoring consistency. Formula: 1 - (team std dev / league avg std dev). Higher = more consistent. Multiplies final score by up to 5%."
                  />
                </TableHead>
              )}
          <TableHead className="text-right">
            <SortButton
              field="postseasonBonus"
              label="PSB"
              tooltip="PSB: Adjusted Postseason Bonus - Championship (1.0), Runner-up (0.7), 3rd (0.45), adjusted by playoff luck differential"
            />
          </TableHead>
          <TableHead className="text-right">
            <SortButton
              field="playoffLuckDiff"
              label="LD"
              tooltip="LD: Playoff Luck Differential - Expected playoff wins minus actual playoff wins (positive = unlucky, negative = lucky)"
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedScores.map((score) => (
          <TableRow key={`${(score as any).year || ''}-${score.team_key}`}>
            {showYear && (
              <TableCell className="font-medium">
                {(score as any).year || '—'}
              </TableCell>
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
                    <span className={cn(
                      "text-lg cursor-help",
                      score.score >= 95 ? "text-yellow-600" :
                      score.score >= 85 ? "text-blue-600" :
                      score.score >= 75 ? "text-green-600" :
                      score.score >= 65 ? "text-gray-600" :
                      "text-muted-foreground"
                    )}>
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
              {score.wins !== undefined && score.losses !== undefined ? (
                `${score.wins}-${score.losses}-${score.ties ?? 0}`
              ) : '—'}
            </TableCell>
            <TableCell className="text-right font-medium">
              {score.points_for !== undefined && score.points_for > 0 ? score.points_for.toFixed(2) : '—'}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {score.points_against !== undefined && score.points_against > 0 ? score.points_against.toFixed(2) : '—'}
            </TableCell>
            <TableCell className="text-right">{score.breakdown.pfIndexEra.toFixed(2)}</TableCell>
            <TableCell className="text-right">{(score.breakdown.allPlayWinPct * 100).toFixed(1)}%</TableCell>
            <TableCell className="text-right">{score.breakdown.regularSeasonScore.toFixed(2)}</TableCell>
            <TableCell className="text-right">{score.breakdown.weeklyCeilingRate.toFixed(2)}</TableCell>
            <TableCell className="text-right">{score.breakdown.strengthOfSchedule.toFixed(2)}</TableCell>
            {hasWeeklyScores && (
              <TableCell className="text-right">
                {score.breakdown.consistencyIndex === 0 ? (
                  <span className="text-muted-foreground text-xs">N/A</span>
                ) : (
                  score.breakdown.consistencyIndex.toFixed(2)
                )}
              </TableCell>
            )}
            <TableCell className="text-right">{score.breakdown.postseasonBonus.toFixed(2)}</TableCell>
            <TableCell className={cn(
              "text-right",
              score.breakdown.playoffLuckDiff > 0 ? "text-red-600" :
              score.breakdown.playoffLuckDiff < 0 ? "text-green-600" :
              "text-muted-foreground"
            )}>
              {score.breakdown.playoffLuckDiff > 0 ? '+' : ''}{score.breakdown.playoffLuckDiff.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
