# Setup Instructions

## Quick Start Checklist

### ✅ Completed Setup
- [x] Next.js 15 project initialized with TypeScript and Tailwind CSS
- [x] Shadcn/UI components installed and configured
- [x] NextAuth.js configured with Yahoo OAuth provider
- [x] Supabase integration set up for database
- [x] All pages created (Home, Standings, Managers, Records, Rivalry)
- [x] Live Scores component with broadcast-style UI
- [x] Server Actions for Yahoo API data fetching
- [x] Token refresh logic implemented
- [x] Database schema created

### 📋 Required Configuration

#### 1. Yahoo Developer Setup
1. Visit https://developer.yahoo.com/apps
2. Create a new application
3. Select **Fantasy Sports** API
4. Set callback URL:
   - Local: `http://localhost:3000/api/auth/callback/yahoo`
   - Production: `https://your-domain.vercel.app/api/auth/callback/yahoo`
5. Copy Client ID and Client Secret

#### 2. Supabase Setup
1. Create account at https://supabase.com
2. Create a new project
3. Go to SQL Editor and run `supabase/schema.sql`
4. Copy:
   - Project URL
   - Anon Key
   - Service Role Key (keep secret!)

#### 3. Environment Variables
Create `.env.local` file (copy from `env.example`):

```env
# Yahoo
YAHOO_CLIENT_ID=your_client_id
YAHOO_CLIENT_SECRET=your_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# League (format: nfl.2024.l.123456)
NEXT_PUBLIC_YAHOO_LEAGUE_KEY=your_league_key
```

**Generate NextAuth Secret:**
```bash
openssl rand -base64 32
```

**Find Your League Key:**
- Check your Yahoo Fantasy League URL
- Format: `{game_key}.l.{league_id}`
- Example: `nfl.2024.l.123456`
- You can also fetch it via API after authentication

### 🚀 Running the App

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000

### 🔑 First Sign In

1. Navigate to `/auth/signin`
2. Click "Sign in with Yahoo"
3. Authorize the application
4. You'll be redirected to `/standings`

### 📊 Database Tables

The schema creates these tables in Supabase:
- `yahoo_tokens` - Stores OAuth tokens for offline access
- `league_standings` - Historical standings data
- `matchups` - Historical matchup data
- `managers` - Manager/team information
- `records` - All-time records and achievements

### 🎨 Customization

**Theme Colors:**
- Edit `app/globals.css` CSS variables
- Modify `tailwind.config.ts` for extended options

**Adding Features:**
- Server Actions: `app/actions/yahoo-actions.ts`
- Yahoo API: `lib/yahoo-api.ts`
- New Pages: Create in `app/[page-name]/page.tsx`

### 🐛 Troubleshooting

**"Not authenticated" errors:**
- Verify Yahoo callback URL matches your domain
- Check environment variables are set
- Ensure you've completed Yahoo OAuth flow

**Token refresh issues:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check `yahoo_tokens` table exists
- Verify RLS policies allow token operations

**API errors:**
- Ensure Yahoo app is approved for Fantasy Sports API
- Check league key format is correct
- Verify `fspt-r` scope is included

### 📝 Next Steps

1. **Configure League Key** - Set `NEXT_PUBLIC_YAHOO_LEAGUE_KEY` in `.env.local`
2. **Test Authentication** - Sign in and verify tokens are stored
3. **Sync Historical Data** - Create scripts to backfill past seasons
4. **Deploy to Vercel** - Push to GitHub and import in Vercel
5. **Update Callback URL** - Update Yahoo app with production URL

### 🔗 Useful Links

- [Yahoo Fantasy Sports API Docs](https://developer.yahoo.com/fantasysports/guide/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Deployment](https://vercel.com/docs)
