/**
 * Production Environment Validation
 * Ensures dangerous development flags are not enabled in production
 */

import { logger } from './logger';

interface ValidationError {
  variable: string;
  value: string;
  reason: string;
}

/**
 * Validates that production environment is secure
 * Throws error if dangerous flags are enabled
 */
export function validateProductionEnv(): void {
  // Only validate in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const errors: ValidationError[] = [];

  // Check for dangerous bypass flags
  if (process.env.SKIP_AUTH === 'true') {
    errors.push({
      variable: 'SKIP_AUTH',
      value: 'true',
      reason: 'Authentication bypass is not allowed in production',
    });
  }

  if (process.env.SKIP_RATE_LIMIT === 'true') {
    errors.push({
      variable: 'SKIP_RATE_LIMIT',
      value: 'true',
      reason: 'Rate limit bypass is not allowed in production',
    });
  }

  if (process.env.DEV_BYPASS_USER_ID) {
    errors.push({
      variable: 'DEV_BYPASS_USER_ID',
      value: process.env.DEV_BYPASS_USER_ID,
      reason: 'Development user bypass is not allowed in production',
    });
  }

  if (process.env.ALLOW_DB_SETUP === 'true') {
    logger.warn('ALLOW_DB_SETUP is enabled in production - this should only be temporary', {
      component: 'env-validation',
    });
  }

  // Check for debug flags
  if (process.env.DEBUG === 'true' || process.env.DEBUG === '*') {
    logger.warn('DEBUG mode is enabled in production', {
      component: 'env-validation',
    });
  }

  // Check for test mode
  if (process.env.E2E_TEST_MODE === 'true') {
    errors.push({
      variable: 'E2E_TEST_MODE',
      value: 'true',
      reason: 'E2E test mode is not allowed in production',
    });
  }

  // Check for insecure configurations
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    errors.push({
      variable: 'NODE_TLS_REJECT_UNAUTHORIZED',
      value: '0',
      reason: 'TLS verification bypass is not allowed in production',
    });
  }

  if (errors.length > 0) {
    const errorMessage = errors
      .map((err) => `  - ${err.variable}=${err.value}: ${err.reason}`)
      .join('\n');

    logger.error('Production environment validation failed', new Error('Invalid production configuration'), {
      component: 'env-validation',
      errors,
    });

    throw new Error(
      `PRODUCTION ENVIRONMENT VALIDATION FAILED:\n${errorMessage}\n\nPlease remove these dangerous flags from your production environment.`
    );
  }

  logger.info('Production environment validation passed', {
    component: 'env-validation',
  });
}

/**
 * Validates critical environment variables are set
 */
export function validateRequiredEnv(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}`
    );
  }

  // Warn about recommended but not strictly required vars
  const recommended = [
    'REDIS_URL',
    'SENTRY_DSN',
    'OPENAI_API_KEY',
  ];

  const missingRecommended = recommended.filter((key) => !process.env[key]);

  if (missingRecommended.length > 0 && process.env.NODE_ENV === 'production') {
    logger.warn('Missing recommended environment variables', {
      component: 'env-validation',
      missing: missingRecommended,
    });
  }
}

/**
 * Run all validations
 */
export function validateEnvironment(): void {
  validateRequiredEnv();
  validateProductionEnv();
}
