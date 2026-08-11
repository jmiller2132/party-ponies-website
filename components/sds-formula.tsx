import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Info } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

export function SDSFormula() {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            View PPSI Formula
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              PPSI — Party Ponies Season Index
            </CardTitle>
            <CardDescription>
              A four-pillar metric for comparing individual seasons across different years. No hidden multipliers, no arbitrary weights — just four honest components.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">The Four Pillars:</h3>
              <ul className="space-y-3 text-muted-foreground ml-2">
                <li>
                  <strong className="text-foreground">Dominance (0–50 pts):</strong>{' '}
                  All-Play Win% × 50. Every week, you&apos;re scored against every other team —
                  not just your scheduled opponent. Completely schedule-neutral.
                </li>
                <li>
                  <strong className="text-foreground">Era-Adjusted Scoring (0–55+ pts):</strong>{' '}
                  (PF / league avg) × 25 + scoring percentile × 25. The first half normalizes
                  your raw output against the league&apos;s scoring environment that year. The second
                  half ranks you among peers. Together they compare fairly across seasons where
                  league-wide totals differ.
                </li>
                <li>
                  <strong className="text-foreground">Schedule Luck Adjustment (±7 pts):</strong>{' '}
                  (APW − actual win%) × 15. If your All-Play Win% was 0.65 but you only won 45%
                  of your actual games, you drew a tough schedule — positive adjustment. If your
                  record outpaced your dominance, negative adjustment. Small in magnitude,
                  but principled.
                </li>
                <li>
                  <strong className="text-foreground">Season Result (0–30 pts):</strong>{' '}
                  Champion +30 | Runner-up +18 | 3rd place +10 | 4th place +4 | Missed playoffs 0.
                  Results matter — but they&apos;re additive, not multiplicative.
                </li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Formula:</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-1">
                <div>PPSI = (APW × 50)</div>
                <div className="pl-8">+ (PF/avgPF × 25 + scoringPercentile × 25)</div>
                <div className="pl-8">+ (APW − actualWin%) × 15</div>
                <div className="pl-8">+ SeasonResultBonus</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Score Interpretation:</h3>
              <ul className="space-y-1 text-muted-foreground ml-2 text-xs">
                <li><strong className="text-yellow-600">110+</strong> — All-time, generational season</li>
                <li><strong className="text-blue-600">95–109</strong> — Elite: dominant team or dominant result</li>
                <li><strong className="text-green-600">80–94</strong> — Very good season</li>
                <li><strong className="text-gray-600">65–79</strong> — Solid, above-average season</li>
                <li><strong>Below 65</strong> — Below average season</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}
