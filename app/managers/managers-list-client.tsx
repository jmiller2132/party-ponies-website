"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Trophy } from "lucide-react"
import { ManagerStats } from "@/lib/manager-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"

export function ManagersListClient({ initialStats }: { initialStats: ManagerStats[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  
  const filteredStats = useMemo(() => {
    if (!initialStats || initialStats.length === 0) {
      return []
    }
    
    let filtered = initialStats
    
    if (filter === 'active') {
      filtered = filtered.filter(s => s.is_active)
    } else if (filter === 'inactive') {
      filtered = filtered.filter(s => !s.is_active)
    }
    
    // Sort by championships, then total wins, then name
    return [...filtered].sort((a, b) => {
      if (a.all_time.championships !== b.all_time.championships) {
        return b.all_time.championships - a.all_time.championships
      }
      if (a.all_time.total_wins !== b.all_time.total_wins) {
        return b.all_time.total_wins - a.all_time.total_wins
      }
      return a.owner_name.localeCompare(b.owner_name)
    })
  }, [initialStats, filter])
  
  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({initialStats.length})
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active ({initialStats.filter(s => s.is_active).length})
        </Button>
        <Button
          variant={filter === 'inactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('inactive')}
        >
          Inactive ({initialStats.filter(s => !s.is_active).length})
        </Button>
      </div>
      
      {/* Manager Cards */}
      {filteredStats.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'No managers found.' 
                : filter === 'active'
                ? 'No active managers found.'
                : 'No inactive managers found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStats.map((stats) => {
          const winPct = stats.all_time.total_wins + stats.all_time.total_losses + stats.all_time.total_ties > 0
            ? (stats.all_time.total_wins / (stats.all_time.total_wins + stats.all_time.total_losses + stats.all_time.total_ties) * 100).toFixed(1)
            : "0.0"
          
          return (
            <Link key={stats.owner_name} href={`/managers/${encodeURIComponent(stats.owner_name)}`}>
              <Card className={`hover:border-primary transition-colors cursor-pointer h-full ${!stats.is_active ? 'opacity-75' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {stats.all_time.championships > 0 && (
                          <Trophy className="h-5 w-5 text-yellow-500" />
                        )}
                        <span>{stats.owner_name}</span>
                        {!stats.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {stats.all_time.seasons_played} {stats.all_time.seasons_played === 1 ? 'season' : 'seasons'}
                      </CardDescription>
                    </div>
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Championships:</span>
                    <span className="font-semibold">{stats.all_time.championships}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Record:</span>
                    <span className="font-medium">
                      {stats.all_time.total_wins}-{stats.all_time.total_losses}-{stats.all_time.total_ties}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Win %:</span>
                    <span className="font-medium">{winPct}%</span>
                  </div>
                  {stats.all_time.avg_sds_plus !== undefined && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg SDS+:</span>
                          <span className="font-medium">{stats.all_time.avg_sds_plus.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">High SDS+:</span>
                          <span className="font-medium text-green-600">{stats.all_time.high_sds_plus?.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Low SDS+:</span>
                          <span className="font-medium text-red-600">{stats.all_time.low_sds_plus?.toFixed(1)}</span>
                        </div>
                      </div>
                    </>
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
