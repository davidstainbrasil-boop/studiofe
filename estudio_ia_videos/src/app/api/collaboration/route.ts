/**
 * 🔄 API Route for Collaboration
 * Initialize WebSocket server for real-time collaboration
 */

import { NextRequest, NextResponse } from 'next/server';
import { Server as HTTPServer } from 'http';
import { CollaborationServer } from '@lib/collaboration/server';
import { logger } from '@lib/logger';
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

let collaborationServer: CollaborationServer | null = null;
let httpServer: HTTPServer | null = null;

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'collaboration-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Initialize collaboration server if not already done
    if (!collaborationServer) {
      // Create HTTP server if it doesn't exist
      if (!httpServer) {
        httpServer = new HTTPServer();
        
        // Start server on a separate port
        const wsPort = parseInt(process.env.WS_PORT || '3001');
        httpServer.listen(wsPort, () => {
          logger.info('Collaboration HTTP server started', {
            port: wsPort,
            service: 'CollaborationAPI'
          });
        });
      }

      // Initialize collaboration server
      collaborationServer = new CollaborationServer(httpServer);
      
      logger.info('Collaboration server initialized', {
        service: 'CollaborationAPI'
      });
    }

    // Return server status and configuration
    const stats = collaborationServer.getStats();
    
    return NextResponse.json({
      success: true,
      status: 'active',
      config: {
        wsUrl: process.env.NEXT_PUBLIC_WS_URL || `ws://localhost:3001`,
        httpUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      },
      stats: {
        connectedSockets: stats.connectedSockets,
        activeRooms: stats.activeRooms,
        totalActiveUsers: stats.totalActiveUsers
      }
    });

  } catch (error) {
    logger.error('Error initializing collaboration server', error instanceof Error ? error : new Error(String(error)), {
      service: 'CollaborationAPI'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to initialize collaboration server',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    switch (body.action) {
      case 'shutdown':
        if (collaborationServer) {
          await collaborationServer.shutdown();
          collaborationServer = null;
        }
        
        if (httpServer) {
          httpServer.close();
          httpServer = null;
        }
        
        logger.info('Collaboration server shut down', {
          service: 'CollaborationAPI'
        });
        
        return NextResponse.json({
          success: true,
          message: 'Collaboration server shut down successfully'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action',
          availableActions: ['shutdown']
        }, { status: 400 });
    }
    
  } catch (error) {
    logger.error('Error in collaboration POST', error instanceof Error ? error : new Error(String(error)), {
      service: 'CollaborationAPI'
    });

    return NextResponse.json({
      success: false,
      error: 'Request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Health check endpoint
export async function OPTIONS() {
  return NextResponse.json({
    status: 'ok',
    endpoints: {
      GET: 'Get server status and stats',
      POST: 'Control server actions (shutdown, restart)'
    }
  });
}