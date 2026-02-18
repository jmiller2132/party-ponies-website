import { Card, CardContent } from "@/components/ui/card"
import { Target } from "lucide-react"
import { getAllLeaguesWithMetadata } from "@/lib/league-utils"
import { getAllManagers } from "@/lib/manager-utils"
import { getTopRivalries } from "@/lib/rivalry-utils"
import { RivalryComparison } from "@/components/rivalry-comparison"
import { TopRivalriesTable } from "@/components/top-rivalries-table"
import { ManagerRivalriesSelector } from "@/components/manager-rivalries-selector"
import { Suspense } from "react"

async function TopRivalriesList() {
  // Only use cached records for fast initial load
  // Uncached records will be populated via background job or on-demand
  const topRivalries = await getTopRivalries(50, true) // cachedOnly = true for performance

  return (
    <TopRivalriesTable
      rivalries={topRivalries}
      title="Top Rivalries"
      description="The most competitive matchups in league history (cached data only for fast loading)"
    />
  )
}

export default async function RivalryPage() {
  // Get all leagues across all years for head-to-head analysis
  const allLeagues = await getAllLeaguesWithMetadata()
  const managers = await getAllManagers()
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Rivalry Tool</h1>
        <p className="text-muted-foreground">
          Track head-to-head matchups and the fiercest rivalries across all seasons ({allLeagues.length} {allLeagues.length === 1 ? 'season' : 'seasons'} available)
        </p>
        {managers.length === 0 && (
          <p className="text-sm text-yellow-600 mt-2">
            ⚠️ No managers found. Please check your league configuration and ensure standings are accessible.
          </p>
        )}
      </div>

      {/* Manager Comparison */}
      {managers.length > 0 ? (
        <RivalryComparison managers={managers} />
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Unable to load managers. Please check your league configuration.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top Rivalries - Load separately to avoid blocking */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Top Rivalries</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The most competitive matchups in league history. Click column headers to sort.
        </p>
        <Suspense fallback={
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">Calculating top rivalries...</p>
            </CardContent>
          </Card>
        }>
          <TopRivalriesList />
        </Suspense>
      </div>

      {/* Per-Manager Top Rivalries - On Demand */}
      {managers.length > 0 && (
        <ManagerRivalriesSelector managers={managers} />
      )}
    </div>
  )
}
