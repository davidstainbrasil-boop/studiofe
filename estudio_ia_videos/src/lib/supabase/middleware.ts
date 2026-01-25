import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getRequiredEnv } from '@lib/env';

/**
 * Cria um cliente Supabase para uso em middleware
 * Gerencia cookies de forma segura no contexto de middleware
 *
 * @throws Error se as variáveis de ambiente não estiverem configuradas
 */
export function createClient(request: NextRequest) {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  // IMPORTANTE: Criar response UMA VEZ e reutilizar
  // Isso garante que todos os cookies setados durante getSession() sejam preservados
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Definir cookie na requisição para propagação downstream
        request.cookies.set({
          name,
          value,
          ...options,
        });
        // Definir cookie na MESMA resposta (não recriar)
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        // Remover cookie da requisição
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        // Remover cookie da MESMA resposta (não recriar)
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  return { supabase, response };
}
