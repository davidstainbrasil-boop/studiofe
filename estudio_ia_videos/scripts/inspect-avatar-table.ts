
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function inspect() {
  console.log('Checking for "avatar_models"...');
  const { data: data1, error: error1 } = await supabase.from('avatar_models').select('*').limit(1);
  if (error1) {
    console.log('Error checking avatar_models:', error1.message);
  } else {
    console.log('avatar_models exists. Sample:', data1);
  }

  console.log('Checking for "avatars_3d"...');
  const { data: data2, error: error2 } = await supabase.from('avatars_3d').select('*').limit(1);
  if (error2) {
    console.log('Error checking avatars_3d:', error2.message);
  } else {
    console.log('avatars_3d exists. Sample:', data2);
  }
}

inspect();
