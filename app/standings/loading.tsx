import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StandingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Table header */}
          <div className="grid grid-cols-6 gap-4 pb-2 border-b border-border">
            {["Rank", "Team", "W", "L", "PF", "PA"].map(h => (
              <Skeleton key={h} className="h-4 w-full" />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-1">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-5 w-full" />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
