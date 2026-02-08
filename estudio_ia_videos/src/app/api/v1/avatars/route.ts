/**
 * API v1: GET /api/v1/avatars
 *
 * List available avatars
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAPIKey, APIKey } from '@/lib/api/api-key-middleware';
import { withRateLimit } from '@/lib/api/rate-limiter';
import { getUnifiedAvatarProvider } from '@/lib/avatar-providers/unified-avatar-provider';
import { applyRateLimit } from '@/lib/rate-limit';

async function handleRequest(request: NextRequest, apiKey: APIKey): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get('language') || undefined;
    const gender = searchParams.get('gender') as 'male' | 'female' | 'neutral' | undefined;
    const style = searchParams.get('style') as 'realistic' | '3d' | 'cartoon' | 'professional' | undefined;

    const provider = getUnifiedAvatarProvider();
    const avatars = await provider.listAllAvatars({
      language,
      gender,
      style,
    });

    return NextResponse.json({
      success: true,
      count: avatars.length,
      avatars: avatars.map((avatar) => ({
        id: avatar.id,
        name: avatar.name,
        provider: avatar.provider,
        thumbnail_url: avatar.thumbnailUrl,
        preview_url: avatar.previewUrl,
        gender: avatar.gender,
        languages: avatar.languages,
        style: avatar.style,
        is_premium: avatar.isPremium,
        capabilities: avatar.capabilities,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list avatars',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-avatars-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  return withRateLimit(request, (req) => withAPIKey(req, handleRequest));
}
