# Owner Names Standardization Setup

This guide helps you standardize owner names across all seasons.

## How It Works

The system maps Yahoo owner names to your preferred standardized names. This ensures consistent display even when:
- Yahoo owner names change slightly over time
- You want to use nicknames instead of full names
- Names have variations (e.g., "John Doe" vs "John" vs "JD")

## Setting Up Your Mappings

1. Open `lib/owner-names.ts`
2. Add your mappings in the `OWNER_NAME_MAPPINGS` object
3. Format: `"Yahoo Owner Name": "Your Standardized Name"`

## Example

```typescript
export const OWNER_NAME_MAPPINGS: OwnerNameMapping = {
  "John Doe": "John",
  "Jane Smith": "Jane",
  "Robert Johnson": "Bob",
  "Michael Williams": "Mike",
}
```

## Finding Yahoo Owner Names

To find the exact Yahoo owner names for your league:

1. Go to any season page (e.g., `/seasons/2025`)
2. Check the browser console or network tab
3. Look at the API responses - owner names will be visible
4. Or check the standings page - hover over team names to see both owner and team names

## Tips

- **Case sensitive**: Yahoo owner names are case-sensitive, so match them exactly
- **Multiple variations**: If an owner name has changed over time, add multiple entries:
  ```typescript
  "John Doe": "John",
  "John D.": "John",
  "JD": "John",
  ```
- **Team name fallback**: If no mapping exists, the system will use the Yahoo owner name, then fall back to team name

## Need Help?

If you're not sure what the Yahoo owner names are, you can:
1. Check the current standings page - it shows owner names
2. Look at the browser developer tools network tab when loading data
3. Or provide me a list of your league members and I can help set it up
