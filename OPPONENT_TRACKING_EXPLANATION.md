# Schedule Luck in PPSI

## How PPSI Handles Schedule Fairness

PPSI (Party Ponies Season Index) uses a **Schedule Luck Adjustment** pillar instead of a Strength of Schedule multiplier.

### The Formula

```
Schedule Luck = (APW − actual_win%) × 15
```

Where:
- **APW** = All-Play Win Percentage (how often you beat every other team each week)
- **actual_win%** = your real record wins / total games

### Why It Works

All-Play Win% already captures how dominant you truly were — it's schedule-neutral by definition. The gap between APW and your actual record reveals how much your schedule helped or hurt you:

| Situation | APW | Actual Win% | Adjustment | Meaning |
|-----------|-----|-------------|------------|---------|
| Unlucky | 0.70 | 0.45 | +3.8 pts | You beat 70% of the league each week but only won 45% of matchups — tough draws |
| Neutral | 0.60 | 0.60 | 0 pts | Your record matched your true performance |
| Lucky | 0.40 | 0.60 | -3.0 pts | You won 60% despite only beating 40% of the field — soft schedule |

### Range

Typical adjustment is ±3–5 points. Extreme cases (APW vs win% differing by 35%+) approach ±7 points.

### Why Not a SoS Multiplier?

The old SDS+ formula used a SoS multiplier on the entire base score, which could swing totals by 10–20% — too much influence for a factor that's partially outside a team's control. The additive adjustment in PPSI keeps the effect principled and bounded.

### Opponent Tracking Data

The weekly score fetcher (`fetchAllWeeklyScores`) already returns `opponent_key` per matchup record:

```typescript
{
  team_key: string
  week: number
  points: number
  opponent_key: string  // which team you faced
}
```

This data is available if you want to build more granular schedule analysis in the future (e.g., showing a team's actual schedule difficulty on the manager profile page).
