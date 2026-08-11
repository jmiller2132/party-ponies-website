import type { Metadata } from "next"
import { getSDSPlusScores } from "@/app/actions/yahoo-actions"
import { getAvailableYears, getLeagueKeyForYear } from "@/lib/season-utils"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SeasonSelector } from "@/components/season-selector"
import { ComparisonTableWithFilters } from "@/components/comparison-table-filters"
import { Sparkles, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SDSFormula } from "@/components/sds-formula"

export const metadata: Metadata = {
  title: "PPSI Season Comparison",
  description: "Compare every Party Ponies season using the PPSI — Party Ponies Season Index. Find out who had the best season in league history.",
  openGraph: {
    title: "PPSI Season Comparison · Party Ponies",
    description: "Who had the best season in league history? Compare all seasons with the Party Ponies Season Index.",
  },
}

// ─── Comparison table (streamed) ──────────────────────────────────────────────

async function ComparisonTable({ selectedYears }: { selectedYears: number[] }) {
  const results = await Promise.all(
    selectedYears.map(async (year) => {
      const leagueKey = await getLeagueKeyForYear(year)
      if (!leagueKey) return null
      const result = await getSDSPlusScores(leagueKey, true)
      if (result.success && result.data) {
        return { year, scores: result.data.map(score => ({ ...score, year })) }
      }
      return null
    })
  )

  const allScores = results.flatMap(r => r ? [r] : [])

  if (allScores.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No data available for the selected seasons.</p>
        </CardContent>
      </Card>
    )
  }

  const flattenedScores = allScores.flatMap(({ scores }) => scores)
  const uniqueOwners = Array.from(new Set(flattenedScores.map(s => s.owner))).sort()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueYears = Array.from(new Set(flattenedScores.map(s => (s as any).year))).sort((a, b) => b - a)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Multi-Season PPSI Comparison
        </CardTitle>
        <CardDescription>
          All seasons ranked by PPSI. Click column headers to sort, use filters to narrow down.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ComparisonTableWithFilters
          scores={flattenedScores}
          availableYears={uniqueYears}
          uniqueOwners={uniqueOwners}
        />
      </CardContent>
    </Card>
  )
}

function ComparisonTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-md" />)}
        </div>
        <div className="grid grid-cols-7 gap-3 pb-2 border-b border-border">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-4" />)}
        </div>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, j) => <Skeleton key={j} className="h-5" />)}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CompareSeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ years?: string }>
}) {
  const params = await searchParams
  const availableYears = await getAvailableYears()

  const selectedYearsParam = params.years ?? ""
  const selectedYears = selectedYearsParam
    .split(",")
    .map(y => parseInt(y.trim()))
    .filter(y => !isNaN(y) && availableYears.includes(y))

  const defaultYears = selectedYears.length === 0 ? availableYears : selectedYears

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-display text-4xl font-bold">Season Comparison</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Every season ranked by PPSI — find the best individual season in league history
          </p>
        </div>
        <Link href="/seasons">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            All Seasons
          </Button>
        </Link>
      </div>

      {/* Season picker */}
      <SeasonSelector availableYears={availableYears} defaultYears={defaultYears} />

      {/* PPSI formula explainer */}
      <SDSFormula />

      {/* Comparison table */}
      <Suspense fallback={<ComparisonTableSkeleton />}>
        <ComparisonTable selectedYears={defaultYears} />
      </Suspense>
    </div>
  )
}
