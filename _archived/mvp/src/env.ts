/**
 * Environment variable validation using Zod.
 * Import this module early (e.g., in layout or API routes) to fail fast
 * if required env vars are missing instead of crashing with unhelpful errors.
 */
import { z } from 'zod';

const serverSchema = z.object({
  /** Supabase project URL */
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),

  /** Supabase anon key (public, safe for client) */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  /** Supabase service role key (server-only, NEVER expose to client) */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  /** Database URL for Prisma */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  /** Redis URL for BullMQ (optional in dev, required in production) */
  REDIS_URL: z.string().optional(),

  /** Node environment */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

/**
 * Validate server-side environment variables.
 * Call this at startup in API routes or server-side code.
 * Throws with descriptive errors if validation fails.
 */
export function validateServerEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`❌ Invalid server environment variables:\n${errors}`);
  }
  return result.data;
}

/**
 * Validate client-side environment variables.
 * Safe for use in browser code — only checks NEXT_PUBLIC vars.
 */
export function validateClientEnv(): ClientEnv {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.success) {
    const errors = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`❌ Invalid client environment variables:\n${errors}`);
  }
  return result.data;
}
