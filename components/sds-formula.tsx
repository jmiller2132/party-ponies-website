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
            View SDS+ Formula
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              SDS+ (Season Dominance Score Plus) Formula
            </CardTitle>
            <CardDescription>
              A luck-adjusted dominance metric designed to compare individual seasons across different years
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Base Score Components:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><strong>PFI Era (30%):</strong> Era-Adjusted Points Index = 0.5 × (PF/League Avg) + 0.5 × PF Percentile Rank</li>
                <li><strong>APW (25%):</strong> All-Play Win Percentage = Win rate if you played every team every week</li>
                <li><strong>RSS (15%):</strong> Regular Season Score = 1 - (rank-1)/(teams-1)</li>
                <li><strong>WCR (10%):</strong> Weekly Ceiling Rate = Highest weekly score / League avg weekly score</li>
                <li><strong>PSB (20%):</strong> Adjusted Postseason Bonus = Championship (1.0), Runner-up (0.7), 3rd (0.45), adjusted by luck differential</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Multipliers:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><strong>SoS:</strong> Strength of Schedule = 1 + (avg opponent APW - 0.50). Multiplies entire base score.</li>
                <li><strong>CI:</strong> Consistency Index = 1 - (team std dev / league avg std dev). Multiplies final score by up to 5%.</li>
              </ul>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Final Formula:</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-xs">
                Base = (0.30 × PFI_era + 0.25 × APW + 0.15 × RSS + 0.10 × WCR) × SoS + 0.20 × PSB_adj<br/>
                SDS+ = 100 × Base × (1 + 0.05 × CI) × Champion_Multiplier<br/>
                <span className="text-muted-foreground">Champion_Multiplier = 1.15 if champion, 1.0 otherwise</span>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Interpretation:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><strong>95+:</strong> All-time, era-defining season</li>
                <li><strong>85-94:</strong> Dominant, likely robbed by variance</li>
                <li><strong>75-84:</strong> Elite champion or contender</li>
                <li><strong>65-74:</strong> Solid title or strong season</li>
                <li><strong>&lt;65:</strong> Average or luck-driven outcome</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}
