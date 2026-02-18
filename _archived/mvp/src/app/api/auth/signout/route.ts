import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.warn('Supabase signOut returned error (session may already be expired)', {
      error: error.message,
    });
  }

  // Safety net: ensure all Supabase auth cookies are cleared
  req.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.delete(cookie.name);
    }
  });

  return response;
}
