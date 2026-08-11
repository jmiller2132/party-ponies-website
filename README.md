# Party Ponies Fantasy League Website

A premium Fantasy Football League website that syncs with the Yahoo Fantasy Sports API. Built with Next.js, Tailwind CSS, Shadcn/UI, NextAuth.js, and Supabase.

## Features

- 🏆 **Live Standings** — Real-time league standings synced from Yahoo Fantasy Sports
- 📅 **Season History** — Full standings, records, and playoff brackets for every season
- 📊 **PPSI** — Party Ponies Season Index: a four-pillar metric for comparing seasons across all years
- 👥 **Manager Profiles** — Detailed profiles with historical stats and head-to-head records
- ⚔️ **Rivalry Tool** — Track head-to-head matchups and fierce rivalries
- 🔐 **Yahoo OAuth** — Secure authentication with automatic token refresh
- 💾 **Historical Data** — Permanent storage of league history in Supabase

## Tech Stack

- **Framework:** Next.js 16 (App Router + Pages Router for NextAuth)
- **Styling:** Tailwind CSS + Shadcn/UI
- **Authentication:** NextAuth.js with custom Yahoo OAuth provider
- **Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Yahoo Developer account (https://developer.yahoo.com/apps)
- A Supabase account (https://supabase.com)

### Step 1: Clone and Install

```bash
npm install
```

### Step 2: Set Up Yahoo Developer Account

1. Go to https://developer.yahoo.com/apps
2. Create a new application (Confidential Client type)
3. Set the callback URL to: `https://localhost:3000/api/auth/callback/yahoo` (local) or `https://www.partyponiesff.com/api/auth/callback/yahoo` (production)
4. Note your Client ID and Client Secret
5. Apply for Fantasy Sports API access at https://sports.yahoo.com/developer/access/

### Step 3: Set Up Supabase

1. Create a new project at https://supabase.com
2. Apply the schema:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   npm run db-push
   ```
3. Note your Project URL, Anon Key, and Service Role Key

### Step 4: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in all required values:

```env
YAHOO_CLIENT_ID=your_yahoo_client_id
YAHOO_CLIENT_SECRET=your_yahoo_client_secret
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_URL=https://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXT_PUBLIC_ALLOWED_LEAGUE_KEYS=423.l.12345,414.l.12345,...
```

**Generate NextAuth Secret:**
```bash
openssl rand -base64 32
```

### Step 5: Run the Development Server

```bash
npm run dev
```

Open [https://localhost:3000](https://localhost:3000) in your browser. Yahoo OAuth requires HTTPS even on localhost.

### Step 6: Sign In

1. Navigate to `/auth/signin`
2. Click "Sign in with Yahoo"
3. Authorize the application
4. You'll be redirected back to the site

### Preventing Supabase Pause (Free Tier)

Supabase pauses free-tier projects after ~7 days of inactivity. Set up a cron job to ping the keepalive URL every 5 days:

- **[cron-job.org](https://cron-job.org)** — URL: `https://www.partyponiesff.com/api/keepalive`
- **[UptimeRobot](https://uptimerobot.com)** — Add HTTP monitor to same URL

## Project Structure

```
party-ponies-website/
├── app/
│   ├── actions/              # Server Actions for data fetching
│   ├── api/auth/             # NextAuth API routes + error page
│   ├── auth/                 # Sign-in page
│   ├── standings/            # Current-season standings
│   ├── seasons/              # Season index + [year] detail + compare
│   ├── managers/             # Manager profiles
│   └── rivalry/              # Rivalry tool
├── components/
│   ├── ui/                   # Shadcn/UI components
│   ├── sds-plus-table.tsx    # PPSI table (sortable, filterable)
│   ├── sds-formula.tsx       # PPSI formula explainer
│   └── navigation.tsx        # Main navigation
├── lib/
│   ├── providers/yahoo.ts    # Custom Yahoo OAuth provider
│   ├── sds-plus.ts           # PPSI scoring algorithm
│   ├── yahoo-game-keys.ts    # Shared game key → year mapping
│   ├── yahoo-api.ts          # Yahoo API client
│   ├── yahoo-auth.ts         # Token refresh logic
│   └── cache.ts              # Supabase caching layer
├── pages/api/auth/           # NextAuth Pages Router handler (required for v4)
└── supabase/schema.sql       # Database schema
```

## Key Features

### PPSI — Party Ponies Season Index

A four-pillar metric for comparing seasons across years:

| Pillar | Range | What it measures |
|--------|-------|-----------------|
| Dominance | 0–50 | All-Play Win% × 50 (schedule-neutral) |
| Scoring | 0–55+ | Era-adjusted points (vs. league avg + percentile) |
| Schedule Luck | ±7 | (APW − actual win%) × 15 |
| Season Result | 0–30 | Champion +30, Runner-up +18, 3rd +10, 4th +4 |

Score thresholds: 110+ all-time | 95–109 elite | 80–94 very good | 65–79 solid | below 65 below average

### Yahoo OAuth Integration

Uses NextAuth.js with a custom Yahoo OAuth provider. Tokens are stored in Supabase and refreshed automatically. Note: Yahoo requires HTTPS even on localhost — use `https://localhost:3000`.

### Game Key Mapping

Yahoo uses numeric "game keys" to identify seasons (e.g. `423` = 2023 season). The canonical mapping lives in `lib/yahoo-game-keys.ts` — update it when Yahoo releases a new season.

## Deployment to Vercel

1. Push to GitHub
2. Import in Vercel, add all environment variables
3. Set `NEXTAUTH_URL` to `https://www.partyponiesff.com`
4. Deploy

**Important:** Yahoo's callback URL in your app settings must exactly match `NEXTAUTH_URL + /api/auth/callback/yahoo`.

## Troubleshooting

### "Not authenticated" / OAuth errors
- Ensure Yahoo callback URL exactly matches `NEXTAUTH_URL/api/auth/callback/yahoo` (no trailing slash)
- Yahoo requires https even for localhost — use `https://localhost:3000`
- Check `AUTH_DEBUG=true` in Vercel env vars for detailed NextAuth logs

### Token refresh issues
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check `yahoo_tokens` table exists and RLS policies are set

### Fantasy Sports API access
- New Yahoo apps must apply for Fantasy Sports API access at https://sports.yahoo.com/developer/access/
- Until approved, auth will fail with `invalid_scope` on the `fspt-r` scope

## License

MIT
