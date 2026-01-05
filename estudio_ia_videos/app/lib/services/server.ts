/**
 * Server Services Module
 * Exportações centralizadas de serviços que requerem ambiente Node.js/Server
 */

// Re-exports Supabase - SERVER (API Routes)
export {
  createClient,
  createClient as createServerSupabaseClient,
  supabaseAdmin,
  getSupabaseForRequest
} from '../supabase/server';
