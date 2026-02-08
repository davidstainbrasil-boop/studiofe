/**
 * API Routes: /api/google/import-slides
 *
 * GET - List available presentations
 * POST - Import a specific presentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuth, GoogleCredentials } from '@/lib/google/google-auth';
import { createGoogleSlidesImporter } from '@/lib/google/slides-importer';
import { createGoogleSlidesConverter } from '@/lib/google/slides-converter';
import { logger } from '@lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET - List presentations from Google Drive
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'google-import-slides-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Get credentials from cookie
    const credentialsCookie = request.cookies.get('google_credentials');
    if (!credentialsCookie) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const credentials: GoogleCredentials = JSON.parse(credentialsCookie.value);
    const auth = getGoogleAuth();

    // Get valid access token
    const accessToken = await auth.getValidAccessToken(credentials);

    // Create importer and list presentations
    const importer = createGoogleSlidesImporter(accessToken);
    const searchParams = request.nextUrl.searchParams;

    const result = await importer.listPresentations({
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      pageToken: searchParams.get('pageToken') || undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to list presentations', error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to list presentations',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Import a specific presentation
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    // Get credentials from cookie
    const credentialsCookie = request.cookies.get('google_credentials');
    if (!credentialsCookie) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const credentials: GoogleCredentials = JSON.parse(credentialsCookie.value);
    const auth = getGoogleAuth();

    // Get valid access token
    const accessToken = await auth.getValidAccessToken(credentials);

    // Get presentation ID from body
    const body = await request.json();
    const { presentationId } = body;

    if (!presentationId) {
      return NextResponse.json(
        { success: false, message: 'Presentation ID is required' },
        { status: 400 }
      );
    }

    logger.info('Importing Google Slides presentation', {
      presentationId,
      component: 'google-import-slides',
    });

    // Import presentation
    const importer = createGoogleSlidesImporter(accessToken);
    const presentation = await importer.importPresentation(presentationId);

    // Convert to pipeline format
    const converter = createGoogleSlidesConverter();
    const converted = converter.convertForPipeline(presentation);

    logger.info('Google Slides import successful', {
      presentationId,
      slideCount: converted.slides.length,
      component: 'google-import-slides',
    });

    return NextResponse.json({
      success: true,
      ...converted,
    });
  } catch (error) {
    logger.error('Failed to import presentation', error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import presentation',
      },
      { status: 500 }
    );
  }
}
