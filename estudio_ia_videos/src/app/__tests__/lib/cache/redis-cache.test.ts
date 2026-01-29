import { CacheTier } from '@/lib/cache/redis-cache';

/**
 * Redis Cache Tests
 * 
 * NOTE: In test environment (NODE_ENV=test), the redis-cache module
 * does NOT initialize Redis connection to avoid side effects.
 * It uses in-memory cache fallback instead.
 * 
 * These tests verify the in-memory fallback behavior which is the 
 * expected behavior in test environment.
 */
describe('Redis Cache System', () => {
  beforeEach(() => {
    jest.resetModules();
    // Clear env vars that might affect behavior
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute query on cache miss (in-memory mode)', async () => {
    // In test env, Redis is not initialized, so it uses in-memory cache
    const { cachedQuery } = await import('@/lib/cache/redis-cache');
    
    const key = 'test-key-' + Date.now();
    const freshValue = { data: 'fresh' };
    const queryFn = jest.fn().mockResolvedValue(freshValue);

    const result = await cachedQuery(key, queryFn, CacheTier.SHORT);

    expect(result).toEqual(freshValue);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should return cached value on cache hit (in-memory mode)', async () => {
    const { cachedQuery } = await import('@/lib/cache/redis-cache');
    
    const key = 'test-key-hit-' + Date.now();
    const cachedValue = { data: 'cached' };
    const queryFn = jest.fn().mockResolvedValue(cachedValue);

    // First call - cache miss, executes query
    const result1 = await cachedQuery(key, queryFn, CacheTier.SHORT);
    expect(result1).toEqual(cachedValue);
    expect(queryFn).toHaveBeenCalledTimes(1);

    // Second call - cache hit, should NOT execute query again
    const result2 = await cachedQuery(key, queryFn, CacheTier.SHORT);
    expect(result2).toEqual(cachedValue);
    // Query should still only have been called once (from first call)
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should retry query when first attempt fails (error handling)', async () => {
    const { cachedQuery } = await import('@/lib/cache/redis-cache');
    
    const key = 'test-key-error-' + Date.now();
    
    // Query fails first time, succeeds second time
    const queryFn = jest.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce({ data: 'retry-success' });

    // The cache error handling retries the query
    const result = await cachedQuery(key, queryFn);
    
    // Should call query twice: first fails (triggers error), second in catch
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'retry-success' });
  });

  it('should throw if query fails on both attempts', async () => {
    const { cachedQuery } = await import('@/lib/cache/redis-cache');
    
    const key = 'test-key-double-error-' + Date.now();
    const queryFn = jest.fn().mockRejectedValue(new Error('Query failed'));

    await expect(cachedQuery(key, queryFn)).rejects.toThrow('Query failed');
    // Called twice: first attempt + retry in catch
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('should have correct cache tier values', () => {
    expect(CacheTier.SHORT).toBe(300);
    expect(CacheTier.MEDIUM).toBe(600);
    expect(CacheTier.LONG).toBe(1800);
    expect(CacheTier.HOUR).toBe(3600);
    expect(CacheTier.DAY).toBe(86400);
  });
});
