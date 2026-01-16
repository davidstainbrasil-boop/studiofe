
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  let missing = false;
  for (const key of requiredVars) {
    if (!process.env[key]) {
      console.error(`❌ Missing Env Var: ${key}`);
      missing = true;
    } else {
      console.log(`✅ Found Env Var: ${key}`);
    }
  }

  if (missing) {
    console.error('⚠️ Critical Env Vars missing. Stopping.');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  console.log('Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('❌ Failed to list buckets:', error.message);
    } else {
      console.log('✅ Connected to Storage. Buckets available:');
      buckets.forEach(b => console.log(` - ${b.name}`));

      const requiredBuckets = ['uploads', 'project-assets'];
      for (const req of requiredBuckets) {
        if (buckets.find(b => b.name === req)) {
          console.log(`  ✅ Bucket '${req}' exists`);
        } else {
          console.error(`  ❌ Bucket '${req}' MISSING`);
        }
      }
    }
  } catch (err: any) {
    console.error('❌ Exception listing buckets:', err.message);
  }

  console.log('--- DIAGNOSTIC END ---');
}

diagnose();
