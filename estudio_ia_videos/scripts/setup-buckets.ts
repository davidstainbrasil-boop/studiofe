
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function setupBuckets() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const bucketsToCreate = [
    { name: 'uploads', public: true },
    { name: 'project-assets', public: true }
  ];

  for (const bucket of bucketsToCreate) {
    console.log(`Checking bucket '${bucket.name}'...`);
    const { data, error } = await supabase.storage.getBucket(bucket.name);
    
    if (error && error.message.includes('not found')) {
      console.log(`Creating bucket '${bucket.name}'...`);
      const { error: createError } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: bucket.name === 'uploads' 
            ? ['application/vnd.openxmlformats-officedocument.presentationml.presentation'] 
            : ['image/png', 'image/jpeg', 'image/jpg'] 
      });
      
      if (createError) {
        console.error(`❌ Failed to create bucket '${bucket.name}':`, createError.message);
      } else {
        console.log(`✅ Bucket '${bucket.name}' created successfully.`);
      }
    } else if (data) {
       console.log(`✅ Bucket '${bucket.name}' already exists.`);
    } else {
       console.error(`❌ Error checking bucket '${bucket.name}':`, error?.message);
    }
  }
}

setupBuckets();
