# Opponent Tracking for Strength of Schedule (SoS)

## Current Implementation
Right now, SoS uses **league average** opponent quality for all teams:
- Formula: `SoS = 1 + (avg opponent APW - 0.50)`
- Since we use league average, everyone gets ~1.0
- **Result**: SoS doesn't differentiate teams at all

## What Opponent Tracking Would Do

### The Concept
Track which **actual opponents** each team faced during the regular season, then calculate the average All-Play Win Percentage (APW) of those specific opponents.

### Example Scenario
Imagine a 10-team league where:
- **Team A** faced: Teams ranked #2, #3, #4, #5, #6, #7, #8, #9, #10, #1 (in order)
- **Team B** faced: Teams ranked #9, #10, #8, #7, #6, #5, #4, #3, #2, #1 (in order)

Team A faced harder opponents on average, so their SoS would be > 1.0
Team B faced easier opponents on average, so their SoS would be < 1.0

### Implementation Steps

1. **Track Opponents Per Week**
   - When fetching weekly matchups, record which team played which opponent each week
   - Example: Week 1: Team A vs Team B → Team A's opponent = Team B

2. **Calculate Opponent APW**
   - For each team, get all opponents they faced during regular season
   - Calculate each opponent's All-Play Win Percentage
   - Average those APWs to get `APW_opp`

3. **Calculate SoS**
   - `SoS = 1 + (APW_opp - 0.50)`
   - If `APW_opp = 0.60` (faced strong teams) → `SoS = 1.10` (10% harder schedule)
   - If `APW_opp = 0.40` (faced weak teams) → `SoS = 0.90` (10% easier schedule)

### Impact on SDS+ Score

Since SoS **multiplies the entire base score**, it can significantly affect rankings:

**Example:**
- Team A: Base score = 0.85, SoS = 1.10 → Final = 0.935
- Team B: Base score = 0.85, SoS = 0.90 → Final = 0.765

A 20% difference in SoS creates a meaningful adjustment!

### What It Would Require

1. **Modify `fetchAllWeeklyScores`** to also return opponent information:
   ```typescript
   {
     team_key: string
     week: number
     points: number
     opponent_key: string  // NEW: Track opponent
   }
   ```

2. **Update `calculateOpponentAPW`** to:
   - Accept opponent tracking data
   - Filter opponents for each team
   - Calculate average APW of those specific opponents

3. **Performance Consideration**:
   - Already fetching matchups, so minimal additional API calls
   - Just need to extract opponent info from existing matchup data

### Benefits

- **Fairness**: Teams with harder schedules get credit
- **Accuracy**: Better reflects true team strength
- **Differentiation**: SoS would actually vary between teams (currently all ~1.0)

### Trade-offs

- **Complexity**: More data to track and process
- **Edge Cases**: What if a team faced the same opponent twice? (Count both)
- **Playoff Impact**: Should only count regular season opponents

## Recommendation

**Worth implementing** because:
1. We already have the matchup data
2. It would make SoS meaningful (currently useless)
3. It's a relatively small code change
4. It significantly improves metric accuracy

The main work is:
- Extracting opponent info from matchups (already fetched)
- Storing it alongside weekly scores
- Calculating average opponent APW per team
