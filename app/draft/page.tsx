import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, TrendingUp, Target, BarChart3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function DraftPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-4xl font-bold">Draft Score</h1>
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3 w-3" />
            Coming Soon
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Analyze draft performance by comparing draft position to season finish
        </p>
        <p className="text-sm text-muted-foreground mt-2 italic">
          Break down draft value by position, identify the best draft picks, and see who got the most value from their draft position.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Draft Position vs Finish
            </CardTitle>
            <CardDescription>
              Compare where players were drafted vs where they finished
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              See which managers got the best value from their draft picks and which picks outperformed expectations.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Position Breakdown
            </CardTitle>
            <CardDescription>
              Draft value analysis by position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Break down draft performance by QB, RB, WR, TE, K, DEF to see which positions provided the best value.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Best Draft Picks
            </CardTitle>
            <CardDescription>
              Identify the steals and busts of each draft
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Highlight the players who significantly outperformed their draft position and those who underperformed.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Manager Draft Grades
            </CardTitle>
            <CardDescription>
              Overall draft performance by manager
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              See which managers consistently draft well and get the most value from their draft position year over year.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
