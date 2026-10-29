import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Info } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { PPSI_V2_THRESHOLDS } from "@/lib/sds-plus"

export function SDSFormula() {
  const t = PPSI_V2_THRESHOLDS
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            View PPSI Formula (v2)
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              PPSI v2 — Party Ponies Season Index
            </CardTitle>
            <CardDescription>
              Four honest pillars. No multipliers, no hidden bonuses. Schedule Luck is shown for
              reference but is <strong>not</strong> counted toward your score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">

            {/* Formula box */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Formula</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-1">
                <div className="font-bold">PPSI = DOM + SCR + REC + RESULT</div>
                <div className="pl-4 text-muted-foreground">DOM    = APW × 50</div>
                <div className="pl-4 text-muted-foreground">SCR    = (PF / avgPF) × 25 + scoringPercentile × 25</div>
                <div className="pl-4 text-muted-foreground">REC    = (W + 0.5×T) / games × 10</div>
                <div className="pl-4 text-muted-foreground">RESULT = playoff finish bonus + seed bonus</div>
                <div className="pl-4 text-muted-foreground mt-1">
                  LUCK   = (APW − win%) × 15  ← shown, not counted
                </div>
              </div>
            </div>

            {/* Pillars */}
            <div>
              <h3 className="font-semibold mb-2">The Four Pillars</h3>
              <ul className="space-y-3 text-muted-foreground ml-2">

                <li>
                  <strong className="text-foreground">1. Dominance (0–50 pts)</strong>
                  <br />
                  <em>All-Play Win% × 50.</em> Every week, your score is compared against every
                  other team — not just your scheduled opponent. Ties count as half a win:
                  <br />
                  <code className="text-xs bg-muted px-1 rounded">APW = (all-play wins + 0.5 × all-play ties) / all-play matchups</code>
                  <br />
                  Only regular-season weeks are used. If a team has 0 or missing points in a
                  week, that team-week is excluded from <em>everyone's</em> all-play matrix for
                  that week. Completely schedule-neutral.
                  <br />
                  <em className="text-xs">10-team example: win 8 of 9 all-play matchups each week → APW ≈ 0.89 → DOM ≈ 44.4</em>
                </li>

                <li>
                  <strong className="text-foreground">2. Era-Adjusted Scoring (0–50 pts)</strong>
                  <br />
                  <em>(PF / league avg PF) × 25 + scoring percentile × 25.</em>
                  <br />
                  PF = <strong>regular-season points only</strong> (computed from weekly scores,
                  not Yahoo's season total, so playoff and consolation games are excluded).
                  <br />
                  Scoring percentile = (N − rank) / (N − 1). Tied PF scores share the average rank.
                  <br />
                  <em className="text-xs">
                    10-team example: you scored 1,480 pts vs. a 1,350 avg (ratio 1.096) and ranked
                    2nd → SCR = 1.096×25 + (0.889×25) = 27.4 + 22.2 = 49.6
                  </em>
                </li>

                <li>
                  <strong className="text-foreground">3. Record (0–10 pts)</strong>
                  <br />
                  <em>(W + 0.5 × T) / games × 10.</em> Rewards winning actual head-to-head games
                  in the regular season. A team that goes 10-3 earns 7.7 pts; 7-6 earns 5.4 pts.
                  <br />
                  <em className="text-xs">10-team example: 9-4 record → (9/13) × 10 = 6.9 pts</em>
                </li>

                <li>
                  <strong className="text-foreground">4. Season Result (0–38 pts)</strong>
                  <br />
                  Based on actual playoff finish. Party Ponies used two bracket formats:
                  <br />
                  <span className="text-muted-foreground text-xs">
                    <strong>2013–2017: 4-team playoff</strong> — semis were 1v4 and 2v3; ranks 5–6 came
                    from a consolation bracket and receive 0 pts.{' '}
                    <strong>2018–present: 6-team playoff</strong> — seeds 1–2 had first-round byes;
                    quarterfinals were 3v6 and 4v5.
                  </span>
                  <br />
                  <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs">
                    <li>Champion: <strong>35</strong></li>
                    <li>Runner-up: <strong>20</strong></li>
                    <li>3rd place: <strong>10</strong></li>
                    <li>4th place: <strong>5</strong></li>
                    <li>Lost quarterfinal (5th–6th, 6-team format only, 2018+): <strong>2</strong></li>
                    <li>Consolation bracket or missed playoffs: <strong>0</strong></li>
                    <li>+<strong>3 bonus</strong> for the #1 regular-season seed (best win%, PF tiebreak) — every season</li>
                  </ul>
                </li>
              </ul>
            </div>

            {/* Schedule Luck */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-1">Schedule Luck (shown, not counted)</h3>
              <p className="text-muted-foreground text-xs">
                <em>(APW − actual win%) × 15.</em> Positive = your dominance outpaced your
                record (you drew a tough schedule). Negative = your record outpaced your
                dominance (you drew an easy schedule). Shown in the table so you can see how
                much luck affected your win total, but it is <strong>not</strong> added to your
                PPSI. Including it in the score punished teams for winning real games, which
                is backwards.
              </p>
              {/* Fallback notice */}
              <p className="text-muted-foreground text-xs mt-2">
                If weekly score data is unavailable for a season, Dominance is estimated from
                actual win% and Luck shows "—". A{' '}
                <span className="text-amber-500 font-bold">⚠</span> marker appears next to the
                PPSI score with a tooltip explaining this.
              </p>
            </div>

            {/* Regular-season-only rules */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-1">Regular Season Only</h3>
              <p className="text-muted-foreground text-xs">
                Dominance, Scoring, and Record all use <strong>regular-season weeks only</strong>.
                The regular-season length comes from Yahoo league settings
                (<code>playoff_start_week − 1</code>). Some Party Ponies seasons had 13-week
                regular seasons (e.g. 2018–2020); others had 14 weeks. Playoff and consolation
                weeks are never included in any pillar calculation.
              </p>
            </div>

            {/* Score interpretation */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Score Labels (hardcoded thresholds)</h3>
              <p className="text-muted-foreground text-xs mb-2">
                Thresholds are fixed so labels don&apos;t shift as new seasons are added.
                Calibrated against the distribution of all Party Ponies team-seasons.
              </p>
              <ul className="space-y-1 text-muted-foreground ml-2 text-xs">
                <li><strong className="text-yellow-600">{t.allTime}+</strong> — All-time, generational season (~top 5%)</li>
                <li><strong className="text-blue-600">{t.elite}–{t.allTime - 1}</strong> — Elite: dominant or dominant result (~next 10%)</li>
                <li><strong className="text-green-600">{t.veryGood}–{t.elite - 1}</strong> — Very good season (~next 15%)</li>
                <li><strong className="text-gray-600">{t.aboveAverage}–{t.veryGood - 1}</strong> — Above average season (~next 25%)</li>
                <li><strong>{t.average}–{t.aboveAverage - 1}</strong> — Average season (~next 25%)</li>
                <li><strong className="text-muted-foreground">Below {t.average}</strong> — Below average season (~bottom 20%)</li>
              </ul>
            </div>

          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}
