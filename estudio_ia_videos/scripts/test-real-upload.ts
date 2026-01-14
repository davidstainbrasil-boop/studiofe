
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars from .env.local if not present (simple parse)
const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env: Record<string, string> = {};
envLocal.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('🧪 Testing Real Upload Pipeline...');
  
  // Create dummy file
  const testFileDetails = {
    name: `test-upload-${Date.now()}.txt`,
    content: 'This is a test file for verifying real uploads.',
    type: 'text/plain'
  };
  
  const filePath = path.join(process.cwd(), testFileDetails.name);
  fs.writeFileSync(filePath, testFileDetails.content);
  
  const fileBuffer = fs.readFileSync(filePath);

  console.log(`📂 Uploading ${testFileDetails.name}...`);
  
  // Note: This script requires a logged-in user usually, but we can test public bucket upload or anonymous if allowed.
  // Assuming 'uploads' bucket allows public uploads for test or we need to sign in.
  // For this simple test, we'll try to sign in as a test user if creds provided, else try anon.
  
  if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
      const { data, error } = await supabase.auth.signInWithPassword({
          email: process.env.TEST_EMAIL,
          password: process.env.TEST_PASSWORD
      });
      if (error) console.warn('⚠️ Login failed:', error.message);
      else console.log('👤 Logged in as:', data.user.email);
  }

  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(`tests/${testFileDetails.name}`, fileBuffer, {
      contentType: testFileDetails.type,
      upsert: true
    });

  // Clean up local file
  fs.unlinkSync(filePath);

  if (error) {
    console.error('❌ Upload Failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Upload Success:', data.path);

  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(data.path);

  console.log('🔗 Public URL:', publicUrl);
  
  // Verify access
  const check = await fetch(publicUrl);
  if (check.ok) {
      console.log('✅ File is accessible via Public URL');
  } else {
      console.error('⚠️ File is NOT accessible (status):', check.status);
  }
}

run().catch(console.error);
