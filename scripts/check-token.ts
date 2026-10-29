import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await s
    .from('yahoo_tokens')
    .select('user_id, expires_at, updated_at')
    .limit(5)

  if (error) {
    console.error('Supabase error:', error.message)
  } else if (!data || data.length === 0) {
    console.log('NO TOKENS FOUND in yahoo_tokens table.')
    console.log('You need to sign in once via the browser to store a token.')
  } else {
    data.forEach(t => {
      const exp = new Date(t.expires_at)
      const now = new Date()
      const expired = exp < now
      console.log(`Token: user=${t.user_id} expires=${exp.toISOString()} ${expired ? '(EXPIRED - refresh will be used)' : '(valid)'} updated=${t.updated_at}`)
    })
  }
}

main().catch(console.error)
