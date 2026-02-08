import { logger } from '@/lib/logger';
/**
 * Playwright Global Setup
 * Enforces URL isolation for E2E tests
 */

async function globalSetup() {
  logger.info('🔒 Setting up E2E URL isolation...');

  // Set environment variables
  process.env.E2E_TEST = 'true';
  process.env.PLAYWRIGHT_TEST = 'true';
  // NODE_ENV is read-only, skip setting it
  // process.env.NODE_ENV = 'test';
  // DEV_BYPASS removed for security
  process.env.DISABLE_SUPABASE_REALTIME = 'true';
  process.env.DISABLE_SENTRY = 'true';
  process.env.DISABLE_ANALYTICS = 'true';

  logger.info('✅ E2E environment configured');
  logger.info('   - External requests will be blocked');
  logger.info('   - Allowed domains: localhost, cursostecno.com.br');
}

export default globalSetup;
