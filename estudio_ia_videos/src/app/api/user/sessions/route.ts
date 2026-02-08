import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * User Sessions API
 * 
 * GET /api/user/sessions - List active sessions
 * DELETE /api/user/sessions?sessionId=xxx - Revoke a session
 * DELETE /api/user/sessions?all=true - Revoke all other sessions
 */

// Types
interface SessionRecord {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

// Parse user agent to get device info
function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = 'Desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect device
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
    device = /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
  }

  // Detect browser
  if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  // Detect OS
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iOS|iPhone|iPad/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

// GET - List sessions
export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'user-sessions-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headersList = await headers();
    const currentUserAgent = headersList.get('user-agent') || '';
    const currentIp = headersList.get('x-forwarded-for')?.split(',')[0] || 
                      headersList.get('x-real-ip') || 
                      'Unknown';

    // Get sessions from user metadata (since Supabase doesn't expose session list)
    const storedSessions = (user.user_metadata?.sessions || []) as SessionRecord[];
    
    // Parse current session info
    const currentSessionInfo = parseUserAgent(currentUserAgent);
    
    // Create/update current session
    const currentSession: SessionRecord = {
      id: 'current',
      ...currentSessionInfo,
      ip: currentIp,
      lastActive: new Date().toISOString(),
      createdAt: user.last_sign_in_at || user.created_at,
      isCurrent: true,
    };

    // Filter out old sessions (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeSessions = storedSessions.filter(session => {
      const lastActive = new Date(session.lastActive);
      return lastActive > thirtyDaysAgo;
    });

    // Add current session at the beginning
    const allSessions = [
      currentSession,
      ...activeSessions.filter(s => s.id !== 'current').map(s => ({ ...s, isCurrent: false })),
    ];

    return NextResponse.json({
      sessions: allSessions,
      currentSessionId: 'current',
      totalSessions: allSessions.length,
    });
  } catch (error) {
    logger.error('Sessions list error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke session(s)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const revokeAll = searchParams.get('all') === 'true';

    if (!sessionId && !revokeAll) {
      return NextResponse.json(
        { error: 'Session ID or all=true required' },
        { status: 400 }
      );
    }

    if (sessionId === 'current') {
      return NextResponse.json(
        { error: 'Cannot revoke current session. Use sign out instead.' },
        { status: 400 }
      );
    }

    const storedSessions = (user.user_metadata?.sessions || []) as SessionRecord[];

    let updatedSessions: SessionRecord[];
    let revokedCount = 0;

    if (revokeAll) {
      // Keep only current session
      revokedCount = storedSessions.filter(s => s.id !== 'current').length;
      updatedSessions = storedSessions.filter(s => s.id === 'current');
    } else {
      // Remove specific session
      const sessionExists = storedSessions.some(s => s.id === sessionId);
      if (!sessionExists) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      updatedSessions = storedSessions.filter(s => s.id !== sessionId);
      revokedCount = 1;
    }

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { sessions: updatedSessions },
    });

    if (updateError) {
      logger.error('Session revocation error:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to revoke session' },
        { status: 500 }
      );
    }

    // Note: In a real implementation, you would also:
    // 1. Invalidate refresh tokens for revoked sessions
    // 2. Use Supabase Admin API to sign out specific sessions
    // This requires SUPABASE_SERVICE_ROLE_KEY and additional logic

    return NextResponse.json({
      success: true,
      message: revokeAll 
        ? `Revoked ${revokedCount} sessions` 
        : 'Session revoked successfully',
      revokedCount,
    });
  } catch (error) {
    logger.error('Session revocation error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
