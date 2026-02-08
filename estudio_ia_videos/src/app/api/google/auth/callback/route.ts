/**
 * API Route: GET /api/google/auth/callback
 *
 * Handles Google OAuth callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuth } from '@/lib/google/google-auth';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'google-auth-callback-get', 20);
    if (rateLimitBlocked) return rateLimitBlocked;

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    logger.error('Google OAuth error', new Error(error));
    return NextResponse.redirect(
      new URL(`/pptx-to-video?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Verify state
  const storedState = request.cookies.get('google_oauth_state')?.value;
  if (!state || state !== storedState) {
    logger.error('Invalid OAuth state', new Error('State mismatch'));
    return NextResponse.redirect(
      new URL('/pptx-to-video?error=invalid_state', request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/pptx-to-video?error=no_code', request.url)
    );
  }

  try {
    const auth = getGoogleAuth();

    // Exchange code for tokens
    const credentials = await auth.exchangeCodeForTokens(code);

    // Get user info
    const userInfo = await auth.getUserInfo(credentials.accessToken);

    logger.info('Google OAuth successful', {
      email: userInfo.email,
      component: 'google-auth-callback',
    });

    // Create response with redirect
    const redirectUrl = new URL('/pptx-to-video?google_connected=true', request.url);
    const response = NextResponse.redirect(redirectUrl);

    // Store tokens in httpOnly cookie (in production, use a more secure method)
    response.cookies.set('google_credentials', JSON.stringify({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Clear state cookie
    response.cookies.delete('google_oauth_state');

    return response;
  } catch (err) {
    logger.error('Token exchange failed', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.redirect(
      new URL('/pptx-to-video?error=token_exchange_failed', request.url)
    );
  }
}
