/**
 * API Route: GET /api/google/auth
 *
 * Initiates Google OAuth flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuth } from '@/lib/google/google-auth';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  const auth = getGoogleAuth();

  if (!auth.isConfigured) {
    return NextResponse.json(
      { success: false, message: 'Google OAuth not configured' },
      { status: 503 }
    );
  }

  // Generate state for CSRF protection
  const state = randomUUID();

  // Store state in cookie for verification
  const authUrl = auth.getAuthorizationUrl(state);

  const response = NextResponse.redirect(authUrl);

  // Set state cookie (httpOnly, secure in production)
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
