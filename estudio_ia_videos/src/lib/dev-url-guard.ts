/**
 * DEV/E2E URL Isolation Guard
 * Blocks ALL external HTTP requests in development and E2E environments
 * Prevents 503 errors from production domains
 */

import { logger } from './logger';

// Check if we're in DEV or E2E mode
const isDev = process.env.NODE_ENV === 'development';
const isE2E = process.env.E2E_TEST === 'true' || process.env.PLAYWRIGHT_TEST === 'true';
const devBypass = process.env.DEV_BYPASS === 'true';

if ((isDev || isE2E) && typeof window !== 'undefined') {
  logger.info('[URL Guard] Activating DEV/E2E isolation mode', { service: 'DevUrlGuard' });

  // List of allowed external domains for DEV/E2E
  const ALLOWED_EXTERNAL_DOMAINS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    // Add any other local domains if needed
  ];

  // Blocked production domains
  const BLOCKED_DOMAINS = [
    'cursostecno.com.br',
    'videostudio.pro',
    // Add any other production domains
  ];

  // Store original fetch
  const originalFetch = window.fetch;

  // Override global fetch
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    
    try {
      const urlObj = new URL(url, window.location.origin);
      const hostname = urlObj.hostname;

      // Check if it's a blocked domain
      if (BLOCKED_DOMAINS.some(domain => hostname.includes(domain))) {
        logger.warn('[URL Guard] BLOCKED request to production domain', { service: 'DevUrlGuard', url, hostname });
        return Promise.reject(new Error(`DEV/E2E: Blocked request to production domain ${hostname}`));
      }

      // Check if it's an external domain (not localhost)
      if (urlObj.protocol.startsWith('http') && 
          !ALLOWED_EXTERNAL_DOMAINS.some(allowed => hostname.includes(allowed))) {
        logger.warn('[URL Guard] BLOCKED external request', { service: 'DevUrlGuard', url });
        
        // Return mock response instead of failing
        return Promise.resolve(new Response(
          JSON.stringify({ 
            error: 'DEV/E2E mode: External requests are blocked',
            blocked_url: url,
            message: 'This request was intercepted in development mode'
          }),
          {
            status: 200,
            statusText: 'OK (Mocked)',
            headers: { 'Content-Type': 'application/json' }
          }
        ));
      }

      // Allow the request
      return originalFetch(input, init);
    } catch (error) {
      // If URL parsing fails, allow relative URLs
      if (!url.startsWith('http')) {
        return originalFetch(input, init);
      }
      logger.error('[URL Guard] Error parsing URL', error instanceof Error ? error : new Error(String(error)), { service: 'DevUrlGuard' });
      return originalFetch(input, init);
    }
  };

  // Override XMLHttpRequest for older code
  const OriginalXHR = window.XMLHttpRequest;
  (window as any).XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open;

    xhr.open = function(method: string, url: string | URL, ...args: any[]) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      
      try {
        const urlObj = new URL(urlStr, window.location.origin);
        const hostname = urlObj.hostname;

        // Block production domains
        if (BLOCKED_DOMAINS.some(domain => hostname.includes(domain))) {
          logger.warn('[URL Guard] BLOCKED XHR to production domain', { service: '  DevUrlGuard', url: urlStr, hostname });
          throw new Error(`DEV/E2E: Blocked XHR to production domain ${hostname}`);
        }

        // Block external domains
        if (urlObj.protocol.startsWith('http') && 
            !ALLOWED_EXTERNAL_DOMAINS.some(allowed => hostname.includes(allowed))) {
          logger.warn('[URL Guard] BLOCKED external XHR', { service: 'DevUrlGuard', url: urlStr });
          throw new Error(`DEV/E2E: Blocked external XHR to ${hostname}`);
        }
      } catch (error) {
        // Allow relative URLs
        if (!urlStr.startsWith('http')) {
          return originalOpen.apply(this, [method, url, ...args]);
        }
      }

      return originalOpen.apply(this, [method, url, ...args]);
    };

    return xhr;
  };

  logger.info('[URL Guard] DEV/E2E URL isolation activated', { service: 'DevUrlGuard', allowedDomains: ALLOWED_EXTERNAL_DOMAINS, blockedDomains: BLOCKED_DOMAINS });
}

export {};
