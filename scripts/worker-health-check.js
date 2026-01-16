import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || String(v).trim().length === 0) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

async function main() {
  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  // Optional, but we validate format if present to catch misconfig early.
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && !/^rediss?:\/\//.test(redisUrl)) {
    throw new Error('Invalid REDIS_URL (expected redis:// or rediss://)');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Lightweight DB check (head-only) - verifies credentials and network reachability.
  const { error } = await supabase.from('render_jobs').select('id', { head: true, count: 'exact' }).limit(1);
  if (error) {
    throw new Error(`Supabase health query failed: ${error.message}`);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    // Keep output short: docker healthcheck logs can be noisy.
    // eslint-disable-next-line no-console
    console.error(`[worker-health-check] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });

