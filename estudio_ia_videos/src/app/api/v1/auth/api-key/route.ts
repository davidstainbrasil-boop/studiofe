/**
 * API v1: /api/v1/auth/api-key
 *
 * POST - Generate new API key
 * DELETE - Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAPIKeyValidator } from '@/lib/api/api-key-middleware';
import { logger } from '@lib/logger';

/**
 * POST - Generate new API key
 *
 * Requires user authentication (session)
 */
export async function POST(request: NextRequest) {
  try {
    // Secure auth - x-user-id BLOCKED in production
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    const body = await request.json();
    const { name, plan } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'API key name is required' },
        { status: 400 }
      );
    }

    const validator = getAPIKeyValidator();
    const result = await validator.generateKey({
      userId,
      name,
      plan: plan || 'free',
    });

    logger.info('API key generated', {
      userId,
      keyId: result.id,
      component: 'api-v1-auth',
    });

    return NextResponse.json({
      success: true,
      api_key: result.key,
      key_id: result.id,
      message: 'Store this API key securely. It will not be shown again.',
    });
  } catch (error) {
    logger.error('Failed to generate API key', error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate API key',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Revoke API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const { getAuthenticatedUserId } = await import('@lib/auth/safe-auth');
    const authResult = await getAuthenticatedUserId(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    const body = await request.json();
    const { key_id } = body;

    if (!key_id) {
      return NextResponse.json(
        { success: false, error: 'key_id is required' },
        { status: 400 }
      );
    }

    const validator = getAPIKeyValidator();
    await validator.revokeKey(key_id, userId);

    logger.info('API key revoked', {
      userId,
      keyId: key_id,
      component: 'api-v1-auth',
    });

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    logger.error('Failed to revoke API key', error instanceof Error ? error : new Error(String(error)));

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke API key',
      },
      { status: 500 }
    );
  }
}
