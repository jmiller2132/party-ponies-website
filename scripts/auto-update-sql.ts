/**
 * Helper script to push migrations using Supabase CLI
 * This is a convenience wrapper - you can also use: npm run db-push
 * Run with: npx tsx scripts/auto-update-sql.ts
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

async function autoUpdateSQL() {
  console.log('🔄 Automatically updating SQL schema in Supabase...\n')

  // Check if Supabase CLI is installed
  try {
    execSync('supabase --version', { stdio: 'ignore' })
    console.log('✅ Supabase CLI found\n')
  } catch (error) {
    console.log('❌ Supabase CLI not found')
    console.log('\n📦 Install it with:')
    console.log('   npm install -g supabase')
    console.log('\n💡 Or use the manual method below\n')
    showManualInstructions()
    return
  }

  // Check if project is linked
  const configPath = join(process.cwd(), '.supabase', 'config.toml')
  if (!existsSync(configPath)) {
    console.log('⚠️  Project not linked to Supabase')
    console.log('\n🔗 Link your project first:')
    console.log('   1. Get your project ref from Supabase dashboard')
    console.log('   2. Run: supabase link --project-ref YOUR_PROJECT_REF')
    console.log('\n💡 Or use the manual method below\n')
    showManualInstructions()
    return
  }

  // Push migrations
  try {
    console.log('📤 Pushing migrations to Supabase...\n')
    execSync('supabase db push', { stdio: 'inherit' })
    console.log('\n✅ Migration completed successfully!')
    console.log('💡 Refresh your website to see the changes')
  } catch (error) {
    console.error('\n❌ Error pushing migrations')
    console.log('\n💡 Try the manual method below\n')
    showManualInstructions()
  }
}

function showManualInstructions() {
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', 'add_owner_name_to_standings.sql')
  
  try {
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log('📋 Manual Method:')
    console.log('   1. Go to https://app.supabase.com')
    console.log('   2. Open SQL Editor → New Query')
    console.log('   3. Copy and paste this SQL:\n')
    console.log(migrationSQL)
    console.log('\n   4. Click Run')
  } catch (error) {
    console.log('Could not read migration file')
  }
}

autoUpdateSQL().catch(console.error)
