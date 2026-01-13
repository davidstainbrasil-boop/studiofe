/**
 * Sentry Configuration for Production Monitoring
 *
 * Tracks errors, performance, and alerts on circuit breaker opens
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENV = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENV,

  // Performance Monitoring
  tracesSampleRate: ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

  // Session Replay
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0,  // 100% of errors

  // Trace propagation targets (moved outside of integration)
  tracePropagationTargets: [
    'localhost',
    'cursostecno.com.br',
    /^\//
  ],

  // Integrations - using new Sentry v8+ API
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,      // Privacy: mask all text
      blockAllMedia: true,    // Privacy: block all media
    }),
  ],

  // Before sending errors
  beforeSend(event, hint) {
    // Don't send client-side errors in development
    if (ENV === 'development' && typeof window !== 'undefined') {
      console.error('Sentry Event (dev):', event, hint);
      return null;
    }

    // Filter out common non-critical errors
    const error = hint?.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);

      // Skip network errors (user's internet issue, not our bug)
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return null;
      }

      // Skip cancelled requests
      if (message.includes('AbortError') || message.includes('cancelled')) {
        return null;
      }
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Random plugins/extensions
    'atomicFindClose',
    // Facebook borked
    'fb_xd_fragment',
    // Network errors (user's problem)
    'NetworkError',
    'Failed to fetch',
    // Cancelled operations
    'AbortError',
    'Request aborted',
  ],

  // Tag all events with deployment info
  initialScope: {
    tags: {
      deployment: 'mvp-video',
      region: 'us-east-1',
    },
  },
});

export default Sentry;
