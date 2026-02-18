# Caching Strategy & Potential Issues

## Current Strategy

### ✅ What Works Well

1. **Historical Seasons (2013-2024)**: Cached permanently - no expiration
2. **Current Season Completed Weeks**: Once a week is marked as completed, cached permanently
3. **Current Season Active Data**: Refreshes weekly (standings, current week matchups)
4. **Status Detection**: Handles multiple Yahoo status values: 'completed', 'finished', 'final'
5. **Fallback Logic**: Historical seasons are always treated as completed, regardless of status

## ⚠️ Potential Issues & Edge Cases

### 1. **Yahoo Status Value Variations**
**Issue**: Yahoo may use different status values than expected
- Current code handles: `'completed'`, `'finished'`, `'final'`
- **Risk**: If Yahoo introduces new status values, completed weeks might not be detected
- **Mitigation**: Historical seasons bypass status check (always permanent)
- **Testing**: Run `npm run test-cache-logic` to verify actual status values

### 2. **Season End Detection**
**Issue**: We don't explicitly detect when a season ends
- Current logic: Compares season year to current calendar year
- **Risk**: If 2025 season ends in January 2026, it might still refresh weekly until 2026
- **Mitigation**: Once calendar year changes, previous season becomes historical automatically
- **Future Improvement**: Could check Yahoo's `is_game_over` flag from league metadata

### 3. **Null/Undefined Statuses**
**Issue**: Some matchups might have null/undefined status
- **Risk**: Completed weeks with null status might refresh unnecessarily
- **Mitigation**: Historical seasons bypass status check
- **Testing**: Test script checks for null statuses

### 4. **Between-Seasons Period**
**Issue**: During off-season (e.g., January-April), no current season exists
- **Risk**: Code might treat last season as "current" if it's the same calendar year
- **Mitigation**: Historical seasons are always permanent regardless
- **Note**: This is actually fine - last season becomes historical once new season starts

### 5. **API Changes**
**Issue**: Yahoo might change their API response format
- **Risk**: Status detection could break
- **Mitigation**: Historical seasons always permanent, status check is secondary
- **Monitoring**: Test script helps identify changes

### 6. **Future Data Types**
**Issue**: When adding new cached data types, need to remember to apply same logic
- **Risk**: New data types might not respect permanent caching for historical data
- **Mitigation**: Documented in code comments, follow existing patterns
- **Checklist**: 
  - ✅ Historical seasons: Never expire
  - ✅ Completed weeks: Never expire
  - ✅ Active data: Weekly refresh

## 🧪 Testing

Run the test script to verify status detection:
```bash
npm run test-cache-logic
```

This will:
- Test historical season (2023) weeks
- Show actual status values from Yahoo
- Identify any null/undefined statuses
- Test current season if available

## 📋 Recommendations

### Short-term (Current Implementation)
✅ **Good as-is** - The current implementation handles most cases well:
- Historical seasons are always permanent (safest approach)
- Status detection is a bonus optimization
- Weekly refresh for active data matches user workflow

### Future Enhancements (Optional)
1. **Season End Detection**: Check Yahoo's `is_game_over` flag to mark entire season as permanent
2. **Status Monitoring**: Log status values to identify any Yahoo API changes
3. **Cache Invalidation**: Add manual cache refresh button for edge cases
4. **Metrics**: Track cache hit rates to verify strategy effectiveness

## 🔍 Code Locations

- **Main Logic**: `lib/cache.ts` - `isCacheFresh()` function
- **Matchup Caching**: `lib/cache.ts` - `getCachedMatchups()` function
- **Status Detection**: `lib/cache.ts` - Lines 344-351
- **Test Script**: `scripts/test-cache-logic.ts`

## ✅ Conclusion

The current caching strategy is **robust and safe**:
- Historical data is always permanent (no risk of stale data)
- Status detection is a performance optimization, not a requirement
- Weekly refresh matches user's workflow
- Edge cases are handled gracefully

**No critical issues identified** - the code is production-ready with good fallback logic.
