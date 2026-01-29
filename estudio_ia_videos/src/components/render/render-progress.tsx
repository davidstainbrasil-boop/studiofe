/**
 * 🎬 Render Progress Component
 * Componente para exibir progresso de renderização em tempo real
 * Suporta: WebSocket, SSE e Polling como fallback
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@lib/logger'
import { Loader2, CheckCircle2, XCircle, Download, Play, Wifi, WifiOff } from 'lucide-react'

export interface RenderStatus {
  jobId: string
  projectId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  outputUrl?: string
  error?: string
  estimatedTime?: number
  currentSlide?: number
  totalSlides?: number
  stage?: 'downloading' | 'processing' | 'encoding' | 'finalizing'
}

export interface RenderProgressProps {
  jobId: string
  onComplete?: (outputUrl: string) => void
  onError?: (error: string) => void
  className?: string
}

export function RenderProgress({
  jobId,
  onComplete,
  onError,
  className = '',
}: RenderProgressProps) {
  const [status, setStatus] = useState<RenderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionType, setConnectionType] = useState<'ws' | 'sse' | 'polling'>('polling')
  const [isConnected, setIsConnected] = useState(false)

  /**
   * Fetch status from API (usado como fallback e inicialização)
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/render/status?jobId=${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status')
      }

      const statusData = data.data || data
      setStatus(statusData)

      // Callbacks
      if (statusData.status === 'completed' && statusData.outputUrl) {
        if (onComplete) {
          onComplete(statusData.outputUrl)
        }
      } else if (statusData.status === 'failed' && statusData.error) {
        setError(statusData.error)
        if (onError) {
          onError(statusData.error)
        }
      }
    } catch (err) {
      logger.error('Error fetching status', err instanceof Error ? err : new Error(String(err)), { component: 'RenderProgress', jobId })
    }
  }, [jobId, onComplete, onError])

  /**
   * Tentar conectar via SSE (mais eficiente que polling)
   */
  useEffect(() => {
    if (!jobId) return

    let eventSource: EventSource | null = null
    let pollingInterval: NodeJS.Timeout | null = null

    // Buscar status inicial
    fetchStatus()

    // Tentar SSE primeiro
    try {
      const sseUrl = `/api/render/progress/stream?jobId=${encodeURIComponent(jobId)}`
      eventSource = new EventSource(sseUrl)

      eventSource.onopen = () => {
        setConnectionType('sse')
        setIsConnected(true)
        logger.debug('SSE connected', { component: 'RenderProgress', jobId })
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setStatus(prev => ({
            ...prev,
            jobId,
            projectId: prev?.projectId || '',
            status: data.status,
            progress: data.progress,
            currentSlide: data.currentSlide,
            totalSlides: data.totalSlides,
            estimatedTime: data.estimatedTimeRemaining,
            outputUrl: data.outputUrl,
            error: data.error
          }))

          // Callbacks
          if (data.status === 'completed' && data.outputUrl) {
            onComplete?.(data.outputUrl)
          } else if (data.status === 'failed' && data.error) {
            setError(data.error)
            onError?.(data.error)
          }
        } catch (err) {
          logger.error('SSE parse error', err instanceof Error ? err : new Error(String(err)), { component: 'RenderProgress' })
        }
      }

      eventSource.onerror = () => {
        // SSE falhou, fallback para polling
        eventSource?.close()
        setConnectionType('polling')
        setIsConnected(false)
        
        pollingInterval = setInterval(fetchStatus, 3000)
      }
    } catch {
      // SSE não suportado, usar polling
      setConnectionType('polling')
      pollingInterval = setInterval(fetchStatus, 3000)
    }

    // Cleanup
    return () => {
      eventSource?.close()
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [jobId, fetchStatus, onComplete, onError])

  /**
   * Cancelar renderização
   */
  async function cancelRender() {
    if (!confirm('Tem certeza que deseja cancelar a renderização?')) {
      return
    }

    try {
      const response = await fetch(`/api/render/cancel/${jobId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchStatus()
      }
    } catch (err) {
      logger.error('Error cancelling render', err instanceof Error ? err : new Error(String(err)), { component: 'RenderProgress', jobId })
    }
  }

  /**
   * Download do vídeo
   */
  function downloadVideo() {
    if (!status?.outputUrl) return

    const link = document.createElement('a')
    link.href = status.outputUrl
    link.download = `video-${jobId}.mp4`
    link.click()
  }

  if (error) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">
              Erro na Renderização
            </h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className={`p-6 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          <span className="text-gray-600">Carregando status...</span>
        </div>
      </div>
    )
  }

  if (status.status === 'completed') {
    return (
      <div className={`p-6 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">
                Vídeo Renderizado com Sucesso!
              </h3>
              <p className="text-sm text-green-700">
                Seu vídeo está pronto para download e visualização.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadVideo}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            {status.outputUrl && (
              <a
                href={status.outputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Play className="w-4 h-4" />
                Assistir
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {status.status === 'pending' ? 'Aguardando...' : 'Renderizando Vídeo'}
          </h3>
        </div>
        {(status.status === 'pending' || status.status === 'processing') && (
          <button
            onClick={cancelRender}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {status.progress}%
          </span>
          {status.estimatedTime && status.estimatedTime > 0 && (
            <span className="text-sm text-gray-500">
              ~{Math.ceil(status.estimatedTime / 60)} min restante(s)
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {status.currentSlide !== undefined && status.totalSlides !== undefined && (
          <div>
            <p className="text-gray-600">Slide</p>
            <p className="font-medium text-gray-900">
              {status.currentSlide} de {status.totalSlides}
            </p>
          </div>
        )}
        {status.stage && (
          <div>
            <p className="text-gray-600">Etapa</p>
            <p className="font-medium text-gray-900 capitalize">
              {getStageLabel(status.stage)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    downloading: 'Baixando arquivos',
    processing: 'Processando slides',
    encoding: 'Codificando vídeo',
    finalizing: 'Finalizando',
  }
  return labels[stage] || stage
}
