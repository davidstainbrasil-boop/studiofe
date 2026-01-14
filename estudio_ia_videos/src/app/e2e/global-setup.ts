/**
 * Playwright Global Setup
 * Enforces URL isolation for E2E tests
 */

async function globalSetup() {
  console.log('🔒 Setting up E2E URL isolation...');
  
  // Set environment variables
  process.env.E2E_TEST = 'true';
  process.env.PLAYWRIGHT_TEST = 'true';
  process.env.NODE_ENV = 'test';
  // DEV_BYPASS removed for security
  process.env.DISABLE_SUPABASE_REALTIME = 'true';
  process.env.DISABLE_SENTRY = 'true';
  process.env.DISABLE_ANALYTICS = 'true';
  
  console.log('✅ E2E environment configured');
  console.log('   - External requests will be blocked');
  console.log('   - Only localhost URLs allowed');
}

export default globalSetup;
