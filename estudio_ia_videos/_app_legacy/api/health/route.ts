/**
 * 🏥 Health Check API
 * MVP Vídeos TécnicoCursos v7
 * 
 * Endpoints:
 * - GET /api/health - Full health check (com score e detalhes)
 * - GET /api/health?type=liveness - Liveness probe (K8s)
 * - GET /api/health?type=readiness - Readiness probe (K8s)
 * - GET /api/health?type=startup - Startup probe (K8s)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  performHealthCheck,
  livenessCheck,
  readinessCheck,
  startupCheck,
} from '../../src/lib/health/health-check';

// ===========================================
// GET Handler
// ===========================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'full';
  const includeDetails = searchParams.get('details') === 'true';

  try {
    switch (type) {
      // Kubernetes Liveness Probe
      // Apenas verifica se o processo está rodando
      case 'liveness':
      case 'live': {
        const result = livenessCheck();
        return NextResponse.json(result, {
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store',
          },
        });
      }

      // Kubernetes Readiness Probe
      // Verifica se pode receber tráfego
      case 'readiness':
      case 'ready': {
        const result = await readinessCheck();
        return NextResponse.json(result, {
          status: result.ready ? 200 : 503,
          headers: {
            'Cache-Control': 'no-cache, no-store',
          },
        });
      }

      // Kubernetes Startup Probe
      // Verificações iniciais (env vars, configs)
      case 'startup': {
        const result = await startupCheck();
        return NextResponse.json(result, {
          status: result.ok ? 200 : 500,
          headers: {
            'Cache-Control': 'no-cache, no-store',
          },
        });
      }

      // Full Health Check
      // Retorna score, componentes, recursos
      case 'full':
      default: {
        const report = await performHealthCheck({
          include_details: includeDetails,
        });

        // Status HTTP baseado no health
        let httpStatus = 200;
        if (report.status === 'degraded') httpStatus = 200; // Degraded ainda aceita tráfego
        if (report.status === 'unhealthy') httpStatus = 503;
        if (report.status === 'unknown') httpStatus = 500;

        return NextResponse.json(report, {
          status: httpStatus,
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'X-Health-Score': report.score.toString(),
            'X-Health-Status': report.status,
          },
        });
      }
    }
  } catch (error) {
    console.error('[Health API] Error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      score: 0,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store',
      },
    });
  }
}

// ===========================================
// HEAD Handler (para monitoramento simples)
// ===========================================

export async function HEAD(): Promise<NextResponse> {
  const { ready } = await readinessCheck();
  
  return new NextResponse(null, {
    status: ready ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store',
    },
  });
}
