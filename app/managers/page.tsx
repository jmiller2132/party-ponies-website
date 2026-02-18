import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllManagerStatsLightweight, ManagerStats } from "@/lib/manager-utils"
import { Suspense, cache } from "react"
import { ManagersListClient } from "./managers-list-client"

// Cache the manager stats to avoid refetching on navigation
const getCachedManagerStats = cache(async () => {
  return await getAllManagerStatsLightweight()
})

async function ManagersListData() {
  // Use optimized function that fetches data once and processes all managers
  // Cached to avoid refetching on navigation
  const managerStats = await getCachedManagerStats()
  return managerStats
}

async function ManagersListWrapper() {
  const stats = await ManagersListData()
  return <ManagersListClient initialStats={stats} />
}

export default async function ManagersPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2">Manager Profiles</h1>
        <p className="text-muted-foreground">
          Explore each manager's history, achievements, and statistics across all seasons
        </p>
      </div>

      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading managers...</p>
          </CardContent>
        </Card>
      }>
        <ManagersListWrapper />
      </Suspense>
    </div>
  )
}
