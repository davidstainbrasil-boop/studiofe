import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const trial = searchParams.get('trial') === 'true'
  const plan = searchParams.get('plan')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Se trial ou plan especificado, inicializar subscription
      if (trial || plan) {
        try {
          const response = await fetch(`${origin}/api/billing/init-trial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              plan: plan || 'pro',
              trialDays: 7,
            }),
          });
          
          if (!response.ok) {
            logger.error('Failed to init trial', new Error(await response.text()));
          }
        } catch (e) {
          logger.error('Error initializing trial', e instanceof Error ? e : new Error(String(e)));
        }
      }
      
      // Redirect with success param if trial was activated
      const redirectUrl = trial 
        ? `${origin}${next}?trial=activated`
        : `${origin}${next}`;
        
      return NextResponse.redirect(redirectUrl)
    }
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
