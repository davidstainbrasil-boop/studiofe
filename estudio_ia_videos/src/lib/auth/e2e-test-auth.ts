/**
 * E2E Test Authentication Helper
 * Provides test token validation when E2E_TEST_MODE=true
 * 
 * SECURITY: This MUST be disabled in production.
 * Only active when E2E_TEST_MODE environment variable is 'true'
 */

const E2E_TEST_TOKEN = process.env.E2E_TEST_TOKEN || 'test-token';

export interface TestAuthResult {
  isTestMode: boolean;
  isValidTestToken: boolean;
  testUserId?: string;
}

/**
 * Check if E2E test mode is enabled (NEVER in production)
 */
export function isE2ETestMode(): boolean {
  // Strict check: must be explicitly enabled AND not production
  return (
    process.env.E2E_TEST_MODE === 'true' &&
    process.env.NODE_ENV !== 'production'
  );
}

/**
 * Validate test token from Authorization header
 * Returns a test user if valid, null otherwise
 */
export function validateTestToken(authHeader: string | null): TestAuthResult {
  if (!isE2ETestMode()) {
    return { isTestMode: false, isValidTestToken: false };
  }

  if (!authHeader) {
    return { isTestMode: true, isValidTestToken: false };
  }

  // Expected format: "Bearer test-token"
  const [type, token] = authHeader.split(' ');
  
  if (type !== 'Bearer' || token !== E2E_TEST_TOKEN) {
    return { isTestMode: true, isValidTestToken: false };
  }

  return {
    isTestMode: true,
    isValidTestToken: true,
    testUserId: 'e2e-test-user-00000000-0000-0000-0000-000000000001'
  };
}

/**
 * E2E test user mock
 */
export const E2E_TEST_USER = {
  id: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
  email: 'e2e-test@localhost',
  name: 'E2E Test User',
  role: 'user'
};
