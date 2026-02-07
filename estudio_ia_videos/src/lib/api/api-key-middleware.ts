/**
 * API Key Middleware
 *
 * Validates API keys for public API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '@lib/logger';
import bcrypt from 'bcryptjs';

const logger = new Logger('api-key-middleware');

// =============================================================================
// Types
// =============================================================================

export interface APIKey {
  id: string;
  key: string;
  userId: string;
  name: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  rateLimit: number; // Requests per minute
  quotaUsed: number;
  quotaLimit: number;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface APIKeyValidation {
  valid: boolean;
  apiKey?: APIKey;
  error?: string;
}

// =============================================================================
// Plan Configurations
// =============================================================================

const PLAN_CONFIGS = {
  free: {
    rateLimit: 10, // 10 requests/minute
    quotaLimit: 100, // 100 requests/month
  },
  starter: {
    rateLimit: 30,
    quotaLimit: 1000,
  },
  pro: {
    rateLimit: 100,
    quotaLimit: 10000,
  },
  enterprise: {
    rateLimit: 1000,
    quotaLimit: 100000,
  },
};

// =============================================================================
// API Key Validator
// =============================================================================

export class APIKeyValidator {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Validate an API key from request
   */
  async validateRequest(request: NextRequest): Promise<APIKeyValidation> {
    // Extract API key from header
    const authHeader = request.headers.get('Authorization');
    const apiKeyHeader = request.headers.get('X-API-Key');

    let apiKey: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    } else if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    }

    if (!apiKey) {
      return {
        valid: false,
        error: 'API key required. Use Authorization: Bearer {key} or X-API-Key header.',
      };
    }

    return this.validateKey(apiKey);
  }

  /**
   * Validate an API key
   */
  async validateKey(key: string): Promise<APIKeyValidation> {
    try {
      // Extract key prefix to find potential matches
      const prefix = key.substring(0, 5); // 'evtv_'
      
      // Get all active keys with same prefix (should be indexed)
      const { data: keys, error } = await (this.supabase
        .from('api_keys' as any)
        .select('*')
        .eq('key_prefix', prefix)
        .eq('is_active', true) as any);

      if (error || !keys || keys.length === 0) {
        return {
          valid: false,
          error: 'Invalid API key',
        };
      }

      // Find matching key by comparing hash
      let matchedKey = null;
      for (const k of keys) {
        const isMatch = await bcrypt.compare(key, k.key_hash);
        if (isMatch) {
          matchedKey = k;
          break;
        }
      }

      if (!matchedKey) {
        return {
          valid: false,
          error: 'Invalid API key',
        };
      }

      const data = matchedKey;

      const apiKey: APIKey = {
        id: data.id,
        key: key, // Return the provided key (not the hash)
        userId: data.user_id,
        name: data.name,
        plan: data.plan || 'free',
        rateLimit: data.rate_limit || PLAN_CONFIGS[(data.plan || 'free') as keyof typeof PLAN_CONFIGS].rateLimit,
        quotaUsed: data.quota_used || 0,
        quotaLimit: data.quota_limit || PLAN_CONFIGS[(data.plan || 'free') as keyof typeof PLAN_CONFIGS].quotaLimit,
        isActive: data.is_active,
        createdAt: data.created_at,
        lastUsedAt: data.last_used_at,
      };

      // Check quota
      if (apiKey.quotaUsed >= apiKey.quotaLimit) {
        return {
          valid: false,
          error: 'API quota exceeded',
        };
      }

      // Update last used timestamp
      await (this.supabase as any)
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey.id);

      return {
        valid: true,
        apiKey,
      };
    } catch (error) {
      logger.error('API key validation failed', error instanceof Error ? error : new Error(String(error)));
      return {
        valid: false,
        error: 'Validation error',
      };
    }
  }

  /**
   * Increment usage quota
   */
  async incrementQuota(apiKeyId: string): Promise<void> {
    try {
      await (this.supabase.rpc as any)('increment_api_quota', {
        key_id: apiKeyId,
      });
    } catch (error) {
      logger.error('Failed to increment quota', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate a new API key
   */
  async generateKey(options: {
    userId: string;
    name: string;
    plan?: APIKey['plan'];
  }): Promise<{ key: string; id: string }> {
    const key = this.generateRandomKey();
    const plan = options.plan || 'free';
    const config = PLAN_CONFIGS[plan];

    // Hash the key before storing
    const keyHash = await bcrypt.hash(key, 10);
    const keyPrefix = key.substring(0, 5); // 'evtv_'

    const { data, error } = await (this.supabase as any)
      .from('api_keys')
      .insert({
        user_id: options.userId,
        name: options.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        plan,
        rate_limit: config.rateLimit,
        quota_limit: config.quotaLimit,
        quota_used: 0,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    // Return the plain key - this is the ONLY time it will be visible
    return {
      key,
      id: data.id,
    };
  }

  /**
   * Revoke an API key
   */
  async revokeKey(apiKeyId: string, userId: string): Promise<void> {
    await (this.supabase as any)
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', apiKeyId)
      .eq('user_id', userId);
  }

  private generateRandomKey(): string {
    const prefix = 'evtv_'; // Estudio Video To Video
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = prefix;
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }
}

// =============================================================================
// Middleware Function
// =============================================================================

/**
 * Middleware to validate API key
 */
export async function withAPIKey(
  request: NextRequest,
  handler: (request: NextRequest, apiKey: APIKey) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const validator = new APIKeyValidator();
    const validation = await validator.validateRequest(request);

    if (!validation.valid || !validation.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Increment quota
    await validator.incrementQuota(validation.apiKey.id);

    // Call handler with validated API key
    return handler(request, validation.apiKey);
  } catch (error) {
    logger.error('API middleware error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Singleton
// =============================================================================

let validatorInstance: APIKeyValidator | null = null;

export function getAPIKeyValidator(): APIKeyValidator {
  if (!validatorInstance) {
    validatorInstance = new APIKeyValidator();
  }
  return validatorInstance;
}

export default APIKeyValidator;
