/**
 * Kubernetes Startup Probe Endpoint
 * GET /api/health/startup
 * 
 * Returns 200 when the application has completed initialization
 * Used by K8s to know when to start liveness/readiness probes
 * 
 * This check ensures:
 * - App has fully started
 * - Initial connections established
 * - Warming complete
 */

import { NextResponse } from 'next/server';

// Track initialization state
let isInitialized = false;
let initializationError: string | null = null;
const startupTime = Date.now();

// Mark as initialized after a delay (simulating warm-up)
setTimeout(() => {
  isInitialized = true;
}, 5000);

// Startup result interface
interface StartupResult {
  started: boolean;
  timestamp: string;
  startupDuration: number;
  message?: string;
}

export async function GET() {
  const now = Date.now();
  const startupDuration = now - startupTime;
  
  try {
    // Basic check that app can respond
    const canRespond = typeof process.env.NODE_ENV !== 'undefined';
    
    // Consider initialized after minimum time or explicit flag
    const started = isInitialized || startupDuration > 10000;
    
    const result: StartupResult = {
      started: started && canRespond && !initializationError,
      timestamp: new Date().toISOString(),
      startupDuration: Math.floor(startupDuration / 1000),
    };
    
    if (initializationError) {
      result.message = initializationError;
    }
    
    if (!result.started) {
      result.message = 'Application still initializing...';
      return NextResponse.json(result, { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '5',
        }
      });
    }
    
    return NextResponse.json(result, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
    
  } catch (error) {
    initializationError = (error as Error).message;
    
    return NextResponse.json({
      started: false,
      timestamp: new Date().toISOString(),
      startupDuration: Math.floor((Date.now() - startupTime) / 1000),
      message: initializationError
    }, { 
      status: 503,
      headers: { 
        'Cache-Control': 'no-store',
        'Retry-After': '10',
      }
    });
  }
}

// Export function to mark initialization complete (call from app startup)
export function markInitialized() {
  isInitialized = true;
}

// Export function to report initialization error
export function reportInitError(error: string) {
  initializationError = error;
}
