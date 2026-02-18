import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * @deprecated Use GET /api/me instead. This route exists only for backward compatibility.
 */
export async function GET() {
  return NextResponse.redirect(new URL('/api/me', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), 307);
}
