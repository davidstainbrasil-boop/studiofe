
import { NextRequest, NextResponse } from 'next/server';

// Mock middleware implementation
export async function rateLimitMiddleware(req: NextRequest) {
  return NextResponse.next();
}

export const rateLimitPresets = {
  render: { limit: 10, window: '1m' },
  authenticated: { limit: 100, window: '1m' },
  public: { limit: 20, window: '1m' }
};

export function createRateLimiter(preset: any) {
  return async (req: NextRequest, handler: Function) => {
    return handler(req);
  };
}
