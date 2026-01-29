import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Rate Limiter Tests
 * 
 * Tests the in-memory fallback rate limiter which is used when Redis
 * is not available (default in test environment without REDIS_URL).
 */
describe('Rate Limiter', () => {
  beforeEach(() => {
    jest.resetModules();
    // Clear any Redis URL to force in-memory mode
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.RATE_LIMIT_FAIL_MODE;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow request when within limit (in-memory mode)', async () => {
    const key = 'test-key-allow-' + Date.now();
    
    const result = await checkRateLimit(key, 10, 60000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // 10 - 1 = 9
    expect(result.source).toBe('memory'); // In test env without Redis, uses memory
    expect(result.limit).toBe(10);
  });

  it('should block request when limit exceeded (in-memory mode)', async () => {
    const key = 'test-key-block-' + Date.now();
    const limit = 3;
    
    // Make requests up to the limit
    for (let i = 0; i < limit; i++) {
      const result = await checkRateLimit(key, limit, 60000);
      expect(result.allowed).toBe(true);
    }
    
    // Next request should be blocked
    const blocked = await checkRateLimit(key, limit, 60000);
    
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.source).toBe('memory');
  });

  it('should track remaining correctly', async () => {
    const key = 'test-key-remaining-' + Date.now();
    const limit = 5;
    
    const result1 = await checkRateLimit(key, limit, 60000);
    expect(result1.remaining).toBe(4);
    
    const result2 = await checkRateLimit(key, limit, 60000);
    expect(result2.remaining).toBe(3);
    
    const result3 = await checkRateLimit(key, limit, 60000);
    expect(result3.remaining).toBe(2);
  });

  it('should reset after window expires', async () => {
    const key = 'test-key-reset-' + Date.now();
    const limit = 2;
    const windowMs = 100; // Very short window for testing
    
    // Exhaust limit
    await checkRateLimit(key, limit, windowMs);
    await checkRateLimit(key, limit, windowMs);
    
    const blocked = await checkRateLimit(key, limit, windowMs);
    expect(blocked.allowed).toBe(false);
    
    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, windowMs + 50));
    
    // Should be allowed again
    const afterReset = await checkRateLimit(key, limit, windowMs);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });
});
