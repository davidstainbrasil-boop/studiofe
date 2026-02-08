/**
 * Auth module - Re-exporta configuração real e helpers unificados.
 * 
 * Em produção, usa authOptions reais com Supabase CredentialsProvider.
 * Para API routes, use getServerAuth() de '@lib/auth/unified-session'.
 */

// Re-export authOptions reais (usados apenas pelo handler NextAuth [...nextauth])
export { authOptions } from './auth-options';

// Re-export helper unificado para API routes
export { getServerAuth } from './unified-session';
