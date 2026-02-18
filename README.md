# Party Ponies Fantasy League Website

A premium Fantasy Football League website that syncs with the Yahoo Fantasy Sports API. Built with Next.js, Tailwind CSS, Shadcn/UI, NextAuth.js, and Supabase.

## Features

- 🏆 **Live Standings** - Real-time league standings synced from Yahoo Fantasy Sports
- 📊 **Live Scores** - Broadcast-style scoreboard for current week matchups
- 👥 **Manager Profiles** - Detailed profiles with historical stats and achievements
- 🏅 **All-Time Records** - Historical records preserved in Supabase
- ⚔️ **Rivalry Tool** - Track head-to-head matchups and fierce rivalries
- 🔐 **Yahoo OAuth** - Secure authentication with automatic token refresh
- 💾 **Historical Data** - Permanent storage of league history in Supabase

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + Shadcn/UI
- **Authentication:** NextAuth.js with Yahoo OAuth provider
- **Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React
- **Deployment:** Vercel (Free Tier)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Yahoo Developer account (https://developer.yahoo.com/apps)
- A Supabase account (https://supabase.com)

### Step 1: Clone and Install

```bash
# Install dependencies
npm install
```

### Step 2: Set Up Yahoo Developer Account

1. Go to https://developer.yahoo.com/apps
2. Create a new application
3. Select "Fantasy Sports" as the API
4. Set the callback URL to: `http://localhost:3000/api/auth/callback/yahoo` (local) or `https://www.partyponiesff.com/api/auth/callback/yahoo` (production)
5. Note down your Client ID and Client Secret

### Step 3: Set Up Supabase

1. Create a new project at https://supabase.com
2. Set up Supabase CLI (see `SUPABASE_SETUP.md` for complete instructions):
   ```bash
   npm install -g supabase
   supabase login
   npm run supabase-init
   npm run supabase-link  # You'll need your project ref
   npm run db-push        # Apply all migrations
   ```
3. Note down your:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) - Keep this secret!

### Step 4: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in all the required values:

```env
YAHOO_CLIENT_ID=your_yahoo_client_id
YAHOO_CLIENT_SECRET=your_yahoo_client_secret
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXT_PUBLIC_YAHOO_LEAGUE_KEY=nfl.2024.l.123456
```

**Generate NextAuth Secret:**
```bash
openssl rand -base64 32
```

**Find Your League Key:**
- Format: `{game_key}.l.{league_id}`
- Example: `nfl.2024.l.123456`
- You can find this in your Yahoo Fantasy League URL or via the API after authentication

### Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 6: Sign In

1. Navigate to `/auth/signin`
2. Click "Sign in with Yahoo"
3. Authorize the application
4. You'll be redirected back to the site

### Preventing Supabase Pause (Free Tier)

Supabase pauses free-tier projects after about **7 days of inactivity**. To keep your project active:

1. **Deploy your app** (e.g. to Vercel) so the keepalive endpoint is reachable.
2. **Ping the keepalive URL** every 5–6 days. Use one of these free options:
   - **[cron-job.org](https://cron-job.org)** – Create a free account → Create Cronjob → URL: `https://www.partyponiesff.com/api/keepalive` → Schedule: every 5 days.
   - **[UptimeRobot](https://uptimerobot.com)** – Add monitor → HTTP(s) → URL: `https://www.partyponiesff.com/api/keepalive` → Check interval: 5 days (or daily for uptime checks).
3. The `/api/keepalive` route runs a tiny Supabase query so the project counts as active.

Alternatively, upgrade to [Supabase Pro](https://supabase.com/pricing) (no auto-pause).

## Project Structure

```
party-ponies-website/
├── app/
│   ├── actions/          # Server Actions for data fetching
│   ├── api/auth/         # NextAuth API routes
│   ├── auth/             # Authentication pages
│   ├── standings/        # Standings page
│   ├── managers/         # Manager profiles page
│   ├── records/          # All-time records page
│   └── rivalry/          # Rivalry tool page
├── components/
│   ├── ui/               # Shadcn/UI components
│   ├── live-scores.tsx   # Live scores component
│   └── navigation.tsx    # Main navigation
├── lib/
│   ├── providers/        # Custom OAuth providers
│   ├── supabase.ts       # Supabase client
│   ├── yahoo-api.ts      # Yahoo API client
│   ├── yahoo-auth.ts     # Token refresh logic
│   └── utils.ts          # Utility functions
└── supabase/
    └── schema.sql        # Database schema
```

## Key Features Explained

### Yahoo OAuth Integration

The app uses NextAuth.js with a custom Yahoo OAuth provider. Tokens are automatically refreshed to prevent expiration and stored in Supabase for offline access.

### Token Refresh Logic

Yahoo tokens expire after 60 minutes. The app automatically refreshes tokens using the refresh token stored in Supabase. The refresh logic is handled in `lib/yahoo-auth.ts`.

### Server Actions

Data fetching is done via Server Actions (`app/actions/yahoo-actions.ts`) which:
- Handle authentication
- Fetch data from Yahoo API
- Return formatted responses
- Can be called from Server Components for optimal performance

### Historical Data Storage

League standings and matchups are stored in Supabase for permanent access. Yahoo only provides access to recent seasons, so this database preserves your league's full history.

## Deployment to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add all environment variables in Vercel's dashboard
4. Deploy!

**Important:** Update your Yahoo app's callback URL to:
`https://www.partyponiesff.com/api/auth/callback/yahoo`

## Customization

### Changing the Theme

The app uses a dark theme by default. To customize:
- Edit `app/globals.css` for color variables
- Modify `tailwind.config.ts` for extended theme options

### Adding More Pages

1. Create a new page in `app/[page-name]/page.tsx`
2. Add a navigation item in `components/navigation.tsx`

## Troubleshooting

### "Not authenticated" errors
- Make sure you've signed in with Yahoo
- Check that your Yahoo app callback URL matches your deployment URL
- Verify environment variables are set correctly

### Token refresh issues
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check that the `yahoo_tokens` table exists in Supabase
- Verify RLS policies allow token storage

### API errors
- Check your Yahoo Developer app is approved for Fantasy Sports API
- Verify your league key format is correct
- Ensure you have the `fspt-r` scope in your OAuth request

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
