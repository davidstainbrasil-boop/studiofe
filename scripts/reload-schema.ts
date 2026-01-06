import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'

// Polyfill fetch
(global as any).fetch = fetch

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reload() {
  console.log('Reloading schema cache...');
  // Try to notify pgrst to reload schema
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: "NOTIFY pgrst, 'reload schema'"
  });
  
  if (error) {
      console.error('RPC Error:', error);
      // Fallback
      console.log('Trying REST fallback...');
       const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql_query: "NOTIFY pgrst, 'reload schema'" })
        });
        
        if (!response.ok) {
            console.error('REST Error:', await response.text());
        } else {
             console.log('REST Success');
        }
  } else {
      console.log('Success via RPC');
  }
}

reload();
