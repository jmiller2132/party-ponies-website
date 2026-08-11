"use client"

import { useState, useTransition, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Loader2, Users, ExternalLink } from "lucide-react"
import { getHeadToHeadRecord } from "@/app/actions/rivalry-actions"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface RivalryComparisonProps {
  managers: string[]
}

interface H2HRecord {
  wins: number
  losses: number
  ties: number
  total_games: number
  points_for: number
  points_against: number
}

function StatBox({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "green" | "red" | "neutral" }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3 px-2">
      <span className={cn(
        "text-2xl font-black tabular-nums",
        highlight === "green" && "text-green-500",
        highlight === "red" && "text-red-500"
      )}>
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

function ManagerColumn({
  name,
  record,
  isWinner,
  side,
}: {
  name: string
  record: H2HRecord
  isWinner: boolean
  side: "left" | "right"
}) {
  const winPct = record.total_games > 0
    ? (((side === "left" ? record.wins : record.losses) / record.total_games) * 100).toFixed(1)
    : "0.0"
  const wins = side === "left" ? record.wins : record.losses
  const losses = side === "left" ? record.losses : record.wins
  const pf = side === "left" ? record.points_for : record.points_against
  const avgPF = record.total_games > 0 ? (pf / record.total_games).toFixed(1) : "0.0"

  return (
    <div className={cn(
      "flex-1 flex flex-col items-center gap-3 p-4 rounded-xl",
      isWinner ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
    )}>
      {isWinner && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
          Leads Series
        </span>
      )}
      <Link
        href={`/managers/${encodeURIComponent(name)}`}
        className="text-center group"
        onClick={e => e.stopPropagation()}
      >
        <p className={cn(
          "font-display font-black text-lg leading-tight group-hover:text-primary transition-colors",
          isWinner ? "text-foreground" : "text-muted-foreground"
        )}>
          {name}
        </p>
        <ExternalLink className="h-3 w-3 inline ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />
      </Link>
      <div className="flex flex-col items-center gap-1 w-full">
        <p className={cn(
          "text-4xl font-black tabular-nums",
          isWinner ? "text-foreground" : "text-muted-foreground"
        )}>
          {wins}
          <span className="text-sm font-normal text-muted-foreground ml-1">W</span>
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">{losses}L{record.ties > 0 ? ` · ${record.ties}T` : ""}</p>
        <p className="text-sm font-semibold">{winPct}%</p>
        <p className="text-xs text-muted-foreground">{pf.toFixed(0)} pts · {avgPF}/game</p>
      </div>
    </div>
  )
}

export function RivalryComparison({ managers }: RivalryComparisonProps) {
  const [manager1, setManager1] = useState<string>("")
  const [manager2, setManager2] = useState<string>("")
  const [record, setRecord] = useState<H2HRecord | null | "empty">(null)
  const [isPending, startTransition] = useTransition()

  // Auto-compare whenever both managers are selected
  useEffect(() => {
    if (!manager1 || !manager2 || manager1 === manager2) {
      setRecord(null)
      return
    }
    startTransition(async () => {
      const result = await getHeadToHeadRecord(manager1, manager2)
      setRecord(result.success && result.data ? result.data : "empty")
    })
  }, [manager1, manager2])

  const pointDiff = record && record !== "empty"
    ? (record.points_for - record.points_against)
    : 0

  const m1Leads = record && record !== "empty" && record.wins > record.losses
  const m2Leads = record && record !== "empty" && record.losses > record.wins
  const tied = record && record !== "empty" && record.wins === record.losses

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Head-to-Head Comparison
        </CardTitle>
        <CardDescription>
          Select two managers to see their all-time head-to-head record across every season
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manager pickers */}
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manager 1</label>
            <Select value={manager1} onValueChange={setManager1}>
              <SelectTrigger>
                <SelectValue placeholder="Select manager…" />
              </SelectTrigger>
              <SelectContent>
                {managers.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center pb-2">
            <span className="font-display font-black text-lg text-muted-foreground">VS</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manager 2</label>
            <Select value={manager2} onValueChange={setManager2}>
              <SelectTrigger>
                <SelectValue placeholder="Select manager…" />
              </SelectTrigger>
              <SelectContent>
                {managers.filter(m => m !== manager1).map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading */}
        {isPending && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading matchup…</span>
          </div>
        )}

        {/* Results */}
        {!isPending && record && record !== "empty" && (
          <div className="space-y-4 pt-2">
            {/* Versus columns */}
            <div className="flex gap-3 items-stretch">
              <ManagerColumn
                name={manager1}
                record={record}
                isWinner={!!m1Leads}
                side="left"
              />
              <div className="flex flex-col items-center justify-center gap-2 px-2 shrink-0">
                <div className="text-center">
                  <p className="text-3xl font-black tabular-nums text-foreground">
                    {record.wins}-{record.losses}{record.ties > 0 ? `-${record.ties}` : ""}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Series</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className={cn(
                    "text-base font-bold tabular-nums",
                    pointDiff > 0 ? "text-green-500" : pointDiff < 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {pointDiff >= 0 ? "+" : ""}{pointDiff.toFixed(0)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pt Diff</p>
                </div>
              </div>
              <ManagerColumn
                name={manager2}
                record={record}
                isWinner={!!m2Leads}
                side="right"
              />
            </div>

            {/* Summary line */}
            <div className="text-center text-sm text-muted-foreground">
              {record.total_games} games played across all seasons ·{" "}
              {m1Leads && <span className="font-semibold text-foreground">{manager1} leads the series</span>}
              {m2Leads && <span className="font-semibold text-foreground">{manager2} leads the series</span>}
              {tied && <span className="font-semibold text-foreground">Series is tied</span>}
            </div>
          </div>
        )}

        {/* No data */}
        {!isPending && record === "empty" && (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No matchups found</p>
            <p className="text-sm mt-1">These managers may not have played in the same seasons.</p>
          </div>
        )}

        {/* Prompt when nothing selected */}
        {!isPending && !record && !(manager1 && manager2) && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Select two managers above to see their head-to-head history
          </div>
        )}
      </CardContent>
    </Card>
  )
}
