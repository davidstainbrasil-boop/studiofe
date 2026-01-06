
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkTables() {
  console.log('Checking tables...')
  
  // Try to insert a dummy user to trigger a more specific error or success
  // Or just list from information_schema if possible via RPC?
  // Supabase JS client doesn't support raw SQL directly without RPC.
  // We can try to select from a table we expect to be there.
  
  const { data, error } = await supabase
    .from('users')
    .select('count', { count: 'exact', head: true })
    
  if (error) {
    console.error('Error selecting from users:', error)
  } else {
    console.log('Success! Users table exists.')
  }
}

checkTables()
