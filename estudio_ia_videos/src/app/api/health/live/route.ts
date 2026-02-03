/**
 * Kubernetes Liveness Probe Endpoint
 * GET /api/health/live
 * 
 * Returns 200 if the application is alive and running
 * Used by K8s to determine if pod should be restarted
 * 
 * This is a lightweight check - only verifies the process is responding
 * No external service checks to avoid cascading failures
 */

import { NextResponse } from 'next/server';

// Track startup time for uptime calculation
const startupTime = Date.now();

// Simple in-memory health state
let lastHeartbeat = Date.now();

// Liveness result interface
interface LivenessResult {
  alive: boolean;
  timestamp: string;
  uptime: number;
  pid: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

// Update heartbeat periodically
setInterval(() => {
  lastHeartbeat = Date.now();
}, 10000);

export async function GET() {
  const now = Date.now();
  
  try {
    // Check if process is responding
    const memoryUsage = process.memoryUsage();
    const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    // Check if last heartbeat was recent (within 60 seconds)
    const heartbeatOk = (now - lastHeartbeat) < 60000;
    
    // Check memory isn't critically high (90% threshold)
    const memoryOk = (heapUsed / heapTotal) < 0.9;
    
    const result: LivenessResult = {
      alive: heartbeatOk && memoryOk,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((now - startupTime) / 1000),
      pid: process.pid,
      memory: {
        used: heapUsed,
        total: heapTotal,
        percentage: Math.round((heapUsed / heapTotal) * 100),
      }
    };
    
    // Update heartbeat on successful request
    lastHeartbeat = now;
    
    if (!result.alive) {
      return NextResponse.json(result, { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
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
    return NextResponse.json({
      alive: false,
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    }, { 
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
