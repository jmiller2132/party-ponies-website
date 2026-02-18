import { getSDSPlusScores } from "@/app/actions/yahoo-actions"
import { getAvailableYears, getLeagueKeyForYear } from "@/lib/season-utils"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SDSPlusTable } from "@/components/sds-plus-table"
import { SeasonSelector } from "@/components/season-selector"
import { ComparisonTableWithFilters } from "@/components/comparison-table-filters"
import { Sparkles, Calendar } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { SDSFormula } from "@/components/sds-formula"

async function ComparisonTable({ selectedYears }: { selectedYears: number[] }) {
  // Fetch all seasons in parallel for better performance
  const results = await Promise.all(
    selectedYears.map(async (year) => {
      const leagueKey = await getLeagueKeyForYear(year)
      if (!leagueKey) return null

      // Skip weekly scores for comparison page to improve performance
      // Weekly scores are less critical for multi-season comparison
      const result = await getSDSPlusScores(leagueKey, true)
      if (result.success && result.data) {
        return {
          year,
          scores: result.data.map(score => ({ ...score, year })),
        }
      }
      return null
    })
  )

  const allScores = results.filter((r): r is { year: number; scores: any[] } => r !== null)

  if (allScores.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No data available for selected seasons.</p>
        </CardContent>
      </Card>
    )
  }

  // Flatten all scores into a single array
  const flattenedScores = allScores.flatMap(({ scores }) => scores)
  
  // Get unique owners and years for filters
  const uniqueOwners = Array.from(new Set(flattenedScores.map(s => s.owner))).sort()
  const uniqueYears = Array.from(new Set(flattenedScores.map(s => (s as any).year))).sort((a, b) => b - a)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Multi-Season SDS+ Comparison
        </CardTitle>
        <CardDescription>
          Compare SDS+ metrics across multiple seasons. Click column headers to sort.
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

export default async function CompareSeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ years?: string }>
}) {
  const params = await searchParams
  const availableYears = await getAvailableYears()
  
  // Parse selected years from query params (comma-separated)
  const selectedYearsParam = params.years || ""
  const selectedYears = selectedYearsParam
    .split(",")
    .map(y => parseInt(y.trim()))
    .filter(y => !isNaN(y) && availableYears.includes(y))

  // Default to all seasons if none selected
  const defaultYears = selectedYears.length === 0
    ? availableYears
    : selectedYears

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-display text-4xl font-bold">Season Comparison</h1>
          </div>
          <p className="text-muted-foreground">
            Compare SDS+ metrics across multiple seasons
          </p>
        </div>
        <Link href="/seasons">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Seasons
          </Button>
        </Link>
      </div>

      {/* Season Selector */}
      <SeasonSelector availableYears={availableYears} defaultYears={defaultYears} />

      {/* SDS+ Formula */}
      <SDSFormula />

      {/* Comparison Table */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading comparison data...</p>
          </CardContent>
        </Card>
      }>
        <ComparisonTable selectedYears={defaultYears} />
      </Suspense>
    </div>
  )
}
