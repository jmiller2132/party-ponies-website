# Quick Start: Supabase CLI Setup

## ✅ Step 1: Install Supabase CLI - DONE!
Supabase CLI is now installed (version 2.72.7)

## Step 2: Login to Supabase

Run this command in your terminal (it will open a browser):
```bash
supabase login
```

## Step 3: Initialize Supabase in Your Project

```bash
npm run supabase-init
```

## Step 4: Link Your Project

1. Get your Project Reference ID:
   - Go to https://app.supabase.com
   - Select your project
   - Go to **Settings** → **General**
   - Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

2. Link the project:
   ```bash
   npm run supabase-link
   ```
   When prompted, paste your project reference ID.

## Step 5: Push All Migrations

```bash
npm run db-push
```

This will automatically apply all migrations from `supabase/migrations/` including the `owner_name` column!

## That's It!

After running `npm run db-push`, refresh your website and owner names should appear on the Seasons page.
