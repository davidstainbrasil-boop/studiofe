/**
 * 📡 Hook useRenderProgressSSE - Progresso em Tempo Real via Server-Sent Events
 * 
 * Versão melhorada do useRenderProgress usando SSE ao invés de polling
 * Mais eficiente e tempo real verdadeiro
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface RenderProgressSSE {
  jobId: string
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep?: string
  currentSlide?: number
  totalSlides?: number
  estimatedTimeRemaining?: number
  outputUrl?: string
  error?: string
  timestamp?: string
}

interface UseRenderProgressSSEOptions {
  enabled?: boolean
  onComplete?: (progress: RenderProgressSSE) => void
  onError?: (error: string) => void
  onProgress?: (progress: RenderProgressSSE) => void
  fallbackToPolling?: boolean
  pollingInterval?: number
}

interface UseRenderProgressSSEReturn {
  progress: RenderProgressSSE | null
  isConnected: boolean
  connectionType: 'sse' | 'polling' | 'disconnected'
  error: string | null
  connect: (jobId: string) => void
  disconnect: () => void
}

export function useRenderProgressSSE(
  jobId?: string | null,
  options: UseRenderProgressSSEOptions = {}
): UseRenderProgressSSEReturn {
  const [progress, setProgress] = useState<RenderProgressSSE | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<'sse' | 'polling' | 'disconnected'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const currentJobIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  
  const { 
    enabled = true, 
    onComplete, 
    onError, 
    onProgress,
    fallbackToPolling = true,
    pollingInterval = 3000
  } = options

  // Limpar tudo
  const cleanupAll = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const disconnect = useCallback(() => {
    cleanupAll()
    setIsConnected(false)
    setConnectionType('disconnected')
    currentJobIdRef.current = null
  }, [cleanupAll])

  // Polling fallback
  const startPolling = useCallback((pollingJobId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    setConnectionType('polling')

    const poll = async () => {
      if (!mountedRef.current) return

      try {
        const response = await fetch(`/api/render/status?jobId=${pollingJobId}`)
        if (!response.ok) throw new Error('Falha ao buscar progresso')
        
        const data = await response.json()
        
        if (!mountedRef.current) return

        const newProgress: RenderProgressSSE = {
          jobId: pollingJobId,
          status: data.status || 'pending',
          progress: data.progress || 0,
          currentStep: data.currentStep,
          outputUrl: data.outputUrl || data.output_url,
          error: data.error || data.error_message,
          timestamp: new Date().toISOString()
        }

        setProgress(newProgress)
        onProgress?.(newProgress)

        // Estados terminais
        if (newProgress.status === 'completed') {
          onComplete?.(newProgress)
          disconnect()
        } else if (['failed', 'cancelled'].includes(newProgress.status)) {
          onError?.(newProgress.error || 'Erro desconhecido')
          disconnect()
        }
      } catch (err) {
        // Error logged in service layer - no console in production
      }
    }

    // Buscar imediatamente
    poll()
    
    // Continuar polling
    pollingRef.current = setInterval(poll, pollingInterval)
  }, [pollingInterval, onProgress, onComplete, onError, disconnect])

  // Conectar via SSE
  const connect = useCallback((newJobId: string) => {
    // Não reconectar ao mesmo job
    if (currentJobIdRef.current === newJobId && isConnected) {
      return
    }

    // Limpar conexões anteriores
    cleanupAll()
    
    setError(null)
    setProgress(null)
    currentJobIdRef.current = newJobId

    // Tentar SSE primeiro
    try {
      const url = `/api/render/progress/stream?jobId=${encodeURIComponent(newJobId)}`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        if (!mountedRef.current) return
        setIsConnected(true)
        setConnectionType('sse')
        setError(null)
      }

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return
        
        try {
          const data: RenderProgressSSE = JSON.parse(event.data)
          setProgress(data)
          onProgress?.(data)

          // Callbacks baseados no status
          if (data.status === 'completed') {
            onComplete?.(data)
            disconnect()
          } else if (data.status === 'failed') {
            onError?.(data.error || 'Erro desconhecido')
            disconnect()
          } else if (data.status === 'cancelled') {
            disconnect()
          }
        } catch (err) {
          // SSE parse error - handled gracefully
        }
      }

      eventSource.onerror = () => {
        if (!mountedRef.current) return
        
        // SSE falhou, tentar polling
        eventSource.close()
        eventSourceRef.current = null
        setIsConnected(false)
        
        if (fallbackToPolling) {
          // SSE connection failed, falling back to polling
          startPolling(newJobId)
        } else {
          setError('Falha na conexão SSE')
          onError?.('Falha na conexão SSE')
          setConnectionType('disconnected')
        }
      }
    } catch {
      // SSE não suportado, usar polling
      if (fallbackToPolling) {
        startPolling(newJobId)
      } else {
        setError('SSE não suportado')
        onError?.('SSE não suportado')
      }
    }
  }, [cleanupAll, isConnected, fallbackToPolling, startPolling, onProgress, onComplete, onError, disconnect])

  // Auto-connect quando jobId muda
  useEffect(() => {
    mountedRef.current = true

    if (!enabled || !jobId) {
      disconnect()
      return
    }

    connect(jobId)

    return () => {
      mountedRef.current = false
      cleanupAll()
    }
  }, [jobId, enabled, connect, disconnect, cleanupAll])

  return {
    progress,
    isConnected,
    connectionType,
    error,
    connect,
    disconnect
  }
}

// Helper para formatar tempo restante
export function formatTimeRemaining(seconds?: number): string {
  if (!seconds || seconds <= 0) return '--:--'
  
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  
  if (mins > 60) {
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }
  
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Helper para porcentagem formatada
export function formatProgress(progress: number): string {
  return `${Math.round(progress)}%`
}

export default useRenderProgressSSE
