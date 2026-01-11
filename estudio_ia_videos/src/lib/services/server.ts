// This file provides compatibility for routes importing from @lib/services/server
// It re-exports functionality from the core Supabase server library
export * from '../supabase/server';
import { createClient } from '../supabase/server';

export const createServerSupabaseClient = createClient;
