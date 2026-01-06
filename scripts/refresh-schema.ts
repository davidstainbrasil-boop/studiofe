
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function refreshSchema() {
  console.log('Force refreshing PostgREST schema cache...')
  
  // Create a dummy function to force schema reload
  // Using direct SQL via a specialized function if available, or just toggling a table.
  // Since we don't have direct SQL execution capability via JS client easily without a pre-existing function,
  // we will try to make a request that might trigger it?
  // Actually, without the ability to run raw SQL, we depend on the setup script.
  // Re-running the setup script might help if it does DDL.
  
  // However, I can try to simply use the 'rpc' to call a built-in cache reload if configured?
  // Unlikely.
  
  // Let's try to query with a header that forces fresh result? No.
  
  console.log('Attempting to access table to warm up cache...')
  const { error } = await supabase.from('users').select('id').limit(1)
  
  if (error) {
    console.log('Error still present:', error.message)
    if (error.message.includes('schema cache')) {
        console.log('Schema cache issue confirmed. Waiting 10s...')
        await new Promise(resolve => setTimeout(resolve, 10000))
    }
  } else {
    console.log('Success! Table accessed.')
  }
}

refreshSchema()
