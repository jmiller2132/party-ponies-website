# Supabase CLI Setup Guide

Complete guide to set up Supabase CLI for automatic database migrations.

## Quick Start

```bash
# 1. Install Supabase CLI
# Windows: scoop install supabase (see Step 1 for details)
# macOS: brew install supabase/tap/supabase

# 2. Login
supabase login

# 3. Initialize (if not already done)
npm run supabase-init

# 4. Link your project
npm run supabase-link
# (You'll need your project ref from Supabase dashboard)

# 5. Push all migrations
npm run db-push
```

## Step-by-Step Instructions

### Step 1: Install Supabase CLI

**⚠️ Important:** Supabase CLI cannot be installed via `npm install -g`. Use one of these methods:

**Windows (using Scoop - recommended):**
```bash
# Install Scoop if you don't have it: https://scoop.sh
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Windows (using Chocolatey):**
```bash
choco install supabase
```

**Windows (Manual - if Scoop/Choco not available):**
1. Download the latest release from: https://github.com/supabase/cli/releases
2. Extract `supabase_windows_amd64.exe` 
3. Rename to `supabase.exe`
4. Add to your PATH or place in a folder that's already in PATH

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
# Download from https://github.com/supabase/cli/releases
# Or use package manager
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate with Supabase.

### Step 3: Initialize Supabase in Your Project

```bash
npm run supabase-init
```

Or manually:
```bash
supabase init
```

This creates a `.supabase` folder with configuration files.

### Step 4: Link Your Project

1. **Get your Project Reference ID:**
   - Go to https://app.supabase.com
   - Select your project
   - Go to **Settings** → **General**
   - Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

2. **Link the project:**
   ```bash
   npm run supabase-link
   ```
   
   Or manually:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

### Step 5: Push Migrations

```bash
npm run db-push
```

This will automatically apply all migrations from `supabase/migrations/` to your Supabase database.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run db-push` | Push all migrations to Supabase |
| `npm run db-migration -- "description"` | Create a new migration file |
| `npm run db-reset` | Reset local database (dev only) |
| `npm run db-diff` | See differences between local and remote |
| `npm run supabase-init` | Initialize Supabase in project |
| `npm run supabase-link` | Link to your Supabase project |

## Creating New Migrations

When you need to make database changes:

```bash
npm run db-migration -- "add new column to table"
```

This creates a new file in `supabase/migrations/` with a timestamp. Edit the file with your SQL, then:

```bash
npm run db-push
```

## Migration Files

All migrations are stored in `supabase/migrations/` and are automatically applied in chronological order.

**Important:** Migration files are version-controlled and should be committed to git.

## Initial Schema Setup

If this is your first time setting up:

1. **Apply the base schema:**
   - Copy contents of `supabase/schema.sql`
   - Paste in Supabase Dashboard → SQL Editor → Run
   - Or use: `npm run db-push` (after linking)

2. **Apply migrations:**
   ```bash
   npm run db-push
   ```

## Troubleshooting

### "supabase: command not found"
- Make sure Supabase CLI is installed globally
- Try: `npm install -g supabase`
- Or use Scoop/Homebrew for Windows/macOS

### "Project not linked"
- Run: `npm run supabase-link`
- Make sure you have the correct project reference ID

### "Migration conflicts"
- Check migration files in `supabase/migrations/`
- Ensure they're in chronological order
- Each migration should be idempotent (use `IF NOT EXISTS`)

### "Permission denied"
- Make sure you're logged in: `supabase login`
- Check that your account has access to the project

## What Gets Managed

Supabase CLI manages:
- ✅ Table schemas
- ✅ Indexes
- ✅ Functions
- ✅ Policies (RLS)
- ✅ Migrations
- ✅ Local development database

## Next Steps

After setup:
1. Run `npm run db-push` to apply existing migrations
2. Future changes: create migrations with `npm run db-migration`
3. Always push migrations before deploying
