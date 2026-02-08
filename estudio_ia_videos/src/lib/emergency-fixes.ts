import type React from 'react'
import { logger } from './logger'

/*
 * Emergency fixes applied at runtime to avoid regressions while the full
 * remediation plan is implemented.
 */

export const fixWebSocketHMR = () => {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV === 'development') return

  const OriginalWebSocket = window.WebSocket
  window.WebSocket = class extends OriginalWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const urlString = url.toString()
      if (urlString.includes('webpack-hmr') || urlString.includes('_next/webpack-hmr')) {
        logger.warn('EMERGENCY: blocked HMR websocket in production', { service: 'EmergencyFixes', url: urlString });
        super('ws://localhost:0', protocols)
        return
      }
      super(url, protocols)
    }
  }
}

export const createSafeEffect = (
  effect: () => void | (() => void),
  deps?: React.DependencyList,
  maxCalls = 10,
) => {
  let callCount = 0
  const startedAt = Date.now()

  return () => {
    callCount += 1
    const elapsed = Date.now() - startedAt

    if (callCount > maxCalls && elapsed < 5_000) {
      logger.warn('EMERGENCY: useEffect called too many times, skipping', {
        service: 'EmergencyFixes',
        calls: callCount,
        elapsed,
        deps,
      });
      return
    }

    if (elapsed > 10_000) {
      callCount = 1
    }

    return effect()
  }
}

export const getEmergencyImageSrc = (originalSrc: string) => {
  const fallbacks: Record<string, string> = {
    'nr35-thumb.jpg': '/api/placeholder/300/200?text=NR35+Trabalho+em+Altura',
    'nr12-thumb.jpg': '/api/placeholder/300/200?text=NR12+Seguranca+Maquinas',
    'nr33-thumb.jpg': '/api/placeholder/300/200?text=NR33+Espaco+Confinado',
    'avatar-executivo-thumb.jpg': '/api/placeholder/300/200?text=Avatar+Executivo',
    'corporativa-thumb.jpg': '/api/placeholder/300/200?text=Treinamento+Corporativo',
  }

  const filename = originalSrc.split('/').pop() || ''
  return fallbacks[filename] || '/api/placeholder/300/200?text=Imagem+Indisponivel'
}

export const createThrottledAnalytics = () => {
  const counters: Record<string, { count: number; lastReset: number }> = {}
  const MAX_EVENTS_PER_MINUTE = 10

  return {
    track: (eventType: string, data?: unknown) => {
      const now = Date.now()
      const entry = counters[eventType] ?? { count: 0, lastReset: now }
      if (!counters[eventType]) counters[eventType] = entry

      if (now - entry.lastReset > 60_000) {
        entry.count = 0
        entry.lastReset = now
      }

      if (entry.count >= MAX_EVENTS_PER_MINUTE) {
        logger.warn(`EMERGENCY: Analytics event "${eventType}" throttled (${entry.count}/${MAX_EVENTS_PER_MINUTE})`, { service: 'EmergencyFixes' });
        return
      }

      entry.count += 1
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Analytics event', { service: 'EmergencyFixes', eventType, data });
      }
    },
  }
}

export const forceLoadingBreak = (timeoutMs = 8_000) => {
  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      logger.info('EMERGENCY: forcing loading state break', { service: 'EmergencyFixes' });
      resolve()
    }, timeoutMs)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        clearTimeout(timeout)
        resolve()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    window.setTimeout(() => {
      clearTimeout(timeout)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, timeoutMs + 1_000)
  })
}

export const createMemorySafeComponent = <T extends object>(component: T): T => {
  const timers: number[] = []

  const safeSetTimeout = (fn: () => void, delay?: number) => {
    const id = window.setTimeout(fn, delay)
    timers.push(id)
    return id
  }

  const safeSetInterval = (fn: () => void, delay?: number) => {
    const id = window.setInterval(fn, delay)
    timers.push(id)
    return id
  }

  window.setTimeout(() => {
    timers.forEach((id) => {
      clearTimeout(id)
      clearInterval(id)
    })
  }, 300_000)

  return component
}

export const initializeEmergencyFixes = () => {
  if (typeof window === 'undefined') return
  fixWebSocketHMR()

  window.addEventListener('beforeunload', () => {
    logger.info('EMERGENCY: Page unloading, cleaning up...', { service: 'EmergencyFixes' });
  })

  let loadingStartedAt = Date.now()
  const monitorLoadingState = () => {
    const stuckElements = document.querySelectorAll('[data-loading="true"], .animate-spin')
    if (stuckElements.length > 0 && Date.now() - loadingStartedAt > 10_000) {
      logger.warn('EMERGENCY: Long loading state detected, breaking animation', { service: 'EmergencyFixes', stuckCount: stuckElements.length });
      stuckElements.forEach((el) => {
        el.removeAttribute('data-loading')
        el.classList.remove('animate-spin')
      })
      loadingStartedAt = Date.now()
    }
  }

  window.setInterval(monitorLoadingState, 5_000)

  logger.info('✅ Emergency fixes initialized')
}

export default {
  fixWebSocketHMR,
  createSafeEffect,
  getEmergencyImageSrc,
  createThrottledAnalytics,
  forceLoadingBreak,
  createMemorySafeComponent,
  initializeEmergencyFixes,
}
