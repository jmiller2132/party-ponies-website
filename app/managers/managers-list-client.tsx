"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Trophy, TrendingUp, Medal } from "lucide-react"
import { ManagerStats } from "@/lib/manager-utils"
import Link from "next/link"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function StatPill({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-lg px-3 py-2 text-center",
      highlight ? "bg-primary/10" : "bg-muted/50"
    )}>
      <span className={cn("text-base font-bold tabular-nums", highlight && "text-primary")}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">{label}</span>
    </div>
  )
}

function ChampionshipTrophies({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <Trophy key={i} className="h-3.5 w-3.5 text-yellow-500" />
      ))}
      {count > 5 && <span className="text-xs text-yellow-500 font-bold ml-1">×{count}</span>}
    </div>
  )
}

function ordinalSuffix(n: number) {
  if (n === 1) return "1st"
  if (n === 2) return "2nd"
  if (n === 3) return "3rd"
  return `${n}th`
}

export function ManagersListClient({ initialStats }: { initialStats: ManagerStats[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredStats = useMemo(() => {
    if (!initialStats || initialStats.length === 0) return []

    let filtered = initialStats
    if (filter === 'active') filtered = filtered.filter(s => s.is_active)
    else if (filter === 'inactive') filtered = filtered.filter(s => !s.is_active)

    return [...filtered].sort((a, b) => {
      if (a.all_time.championships !== b.all_time.championships)
        return b.all_time.championships - a.all_time.championships
      if (a.all_time.total_wins !== b.all_time.total_wins)
        return b.all_time.total_wins - a.all_time.total_wins
      return a.owner_name.localeCompare(b.owner_name)
    })
  }, [initialStats, filter])

  const activeCount = initialStats.filter(s => s.is_active).length
  const inactiveCount = initialStats.filter(s => !s.is_active).length

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {(["all", "active", "inactive"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? `All (${initialStats.length})` : f === "active" ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
          </Button>
        ))}
      </div>

      {filteredStats.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No {filter !== "all" ? filter + " " : ""}managers found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStats.map((stats) => {
            const winPct = stats.all_time.total_wins + stats.all_time.total_losses + stats.all_time.total_ties > 0
              ? stats.all_time.total_wins / (stats.all_time.total_wins + stats.all_time.total_losses + stats.all_time.total_ties) * 100
              : 0
            const record = `${stats.all_time.total_wins}-${stats.all_time.total_losses}${stats.all_time.total_ties > 0 ? `-${stats.all_time.total_ties}` : ""}`

            return (
              <Link key={stats.owner_name} href={`/managers/${encodeURIComponent(stats.owner_name)}`}>
                <Card className={cn(
                  "hover:border-primary transition-colors cursor-pointer h-full",
                  !stats.is_active && "opacity-70"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight truncate flex items-center gap-1.5 flex-wrap">
                          {stats.owner_name}
                          {!stats.is_active && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground font-normal shrink-0">
                              Inactive
                            </span>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <ChampionshipTrophies count={stats.all_time.championships} />
                          {stats.all_time.championships === 0 && (
                            <span className="text-xs text-muted-foreground">
                              {stats.all_time.seasons_played} {stats.all_time.seasons_played === 1 ? "season" : "seasons"}
                            </span>
                          )}
                          {stats.all_time.championships > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {stats.all_time.championships === 1 ? "1 championship" : `${stats.all_time.championships} championships`} · {stats.all_time.seasons_played} seasons
                            </span>
                          )}
                        </div>
                      </div>
                      <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Stat pills */}
                    <div className="grid grid-cols-3 gap-2">
                      <StatPill label="Record" value={record} />
                      <StatPill label="Win %" value={`${winPct.toFixed(1)}%`} />
                      <StatPill label="Best Finish" value={ordinalSuffix(stats.all_time.best_finish)} highlight={stats.all_time.best_finish === 1} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <StatPill label="Avg Finish" value={ordinalSuffix(Math.round(stats.all_time.avg_finish))} />
                      {stats.all_time.avg_sds_plus !== undefined ? (
                        <StatPill label="Avg PPSI" value={stats.all_time.avg_sds_plus.toFixed(1)} />
                      ) : (
                        <StatPill label="Total Wins" value={`${stats.all_time.total_wins}W`} />
                      )}
                    </div>

                    {/* High/low PPSI if available */}
                    {stats.all_time.high_sds_plus !== undefined && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          Peak {stats.all_time.high_sds_plus.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Medal className="h-3 w-3 text-primary" />
                          PPSI
                        </span>
                        <span className="flex items-center gap-1">
                          Low {stats.all_time.low_sds_plus?.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
