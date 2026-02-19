
/**
 * GET /api/health
 * Health check endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthCheckService, type ServiceHealth } from '@lib/monitoring/health-check'
import { applyRateLimit } from '@/lib/rate-limit';

type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

function mapStatus(status: ServiceHealth['status']): ServiceStatus {
  if (status === 'healthy' || status === 'degraded' || status === 'unhealthy' || status === 'unknown') {
    return status
  }
  return 'unknown'
}

async function checkWebSocket(): Promise<{ status: ServiceStatus; detail?: string }> {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL
  const wsPort = parseInt(process.env.WS_PORT || '3001', 10)

  const host = (() => {
    if (!wsUrl) return '127.0.0.1'
    try {
      return new URL(wsUrl).hostname
    } catch {
      return '127.0.0.1'
    }
  })()

  const port = (() => {
    if (!wsUrl) return wsPort
    try {
      const parsed = new URL(wsUrl)
      if (parsed.port) return parseInt(parsed.port, 10)
      return parsed.protocol === 'wss:' ? 443 : 80
    } catch {
      return wsPort
    }
  })()

  try {
    const { Socket } = await import('net')

    await new Promise<void>((resolve, reject) => {
      const socket = new Socket()
      socket.setTimeout(1500)
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('timeout', () => {
        socket.destroy()
        reject(new Error('Connection timeout'))
      })
      socket.once('error', (err) => {
        socket.destroy()
        reject(err)
      })
      socket.connect(port, host)
    })

    return { status: 'healthy', detail: `${host}:${port} reachable` }
  } catch (error) {
    return {
      status: 'degraded',
      detail: error instanceof Error ? error.message : 'WebSocket endpoint unreachable',
    }
  }
}

async function checkTTS(): Promise<{ status: ServiceStatus; detail?: string }> {
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY
  const hasAzure = !!process.env.AZURE_TTS_KEY && !!(process.env.AZURE_TTS_REGION || process.env.AZURE_REGION)

  if (!hasElevenLabs && !hasAzure) {
    return { status: 'unknown', detail: 'No TTS provider configured' }
  }

  const checks: Array<{ status: ServiceStatus; detail?: string }> = []

  if (hasElevenLabs) {
    const elevenLabs = await healthCheckService.checkElevenLabs()
    checks.push({ status: mapStatus(elevenLabs.status), detail: elevenLabs.message })
  }

  if (hasAzure) {
    const region = process.env.AZURE_TTS_REGION || process.env.AZURE_REGION
    const key = process.env.AZURE_TTS_KEY
    try {
      const response = await fetch(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': key as string,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      checks.push({
        status: response.ok ? 'healthy' : 'degraded',
        detail: `Azure TTS token endpoint HTTP ${response.status}`,
      })
    } catch (error) {
      checks.push({
        status: 'degraded',
        detail: error instanceof Error ? error.message : 'Azure TTS check failed',
      })
    }
  }

  if (checks.some((c) => c.status === 'healthy')) {
    return { status: 'healthy', detail: 'At least one TTS provider is healthy' }
  }
  if (checks.some((c) => c.status === 'degraded' || c.status === 'unknown')) {
    return { status: 'degraded', detail: checks.map((c) => c.detail).filter(Boolean).join(' | ') }
  }
  return { status: 'unhealthy', detail: checks.map((c) => c.detail).filter(Boolean).join(' | ') }
}

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'video-pipeline-health-get', 120);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  interface HealthChecks {
    timestamp: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      database?: ServiceStatus;
      redis?: ServiceStatus;
      websocket?: ServiceStatus;
      tts?: ServiceStatus;
      [key: string]: ServiceStatus | undefined;
    };
    details: Record<string, string | undefined>;
  }

  const checks: HealthChecks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {},
    details: {},
  }

  const [database, redis, websocket, tts] = await Promise.all([
    healthCheckService.checkDatabase(),
    healthCheckService.checkRedis(),
    checkWebSocket(),
    checkTTS(),
  ])

  checks.services.database = mapStatus(database.status)
  checks.details.database = database.message

  checks.services.redis = mapStatus(redis.status)
  checks.details.redis = redis.message

  checks.services.websocket = websocket.status
  checks.details.websocket = websocket.detail

  checks.services.tts = tts.status
  checks.details.tts = tts.detail

  const statuses = Object.values(checks.services)
  if (statuses.includes('unhealthy')) {
    checks.status = 'unhealthy'
  } else if (statuses.includes('degraded') || statuses.includes('unknown')) {
    checks.status = 'degraded'
  } else {
    checks.status = 'healthy'
  }

  const httpStatus = checks.status === 'healthy' ? 200 : 503

  if (action === 'video-pipeline') {
    return NextResponse.json(
      {
        ...checks,
        success: checks.status === 'healthy',
        endpoint: '/api/health?action=video-pipeline',
        methods: ['GET'],
      },
      { status: httpStatus }
    )
  }

  return NextResponse.json(checks, { status: httpStatus })
}
