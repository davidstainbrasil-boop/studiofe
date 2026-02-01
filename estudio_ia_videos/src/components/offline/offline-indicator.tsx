'use client'

/**
 * 📴 Offline Indicator Component
 * 
 * Visual indicator for offline status with sync queue info
 * and reconnection notifications
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CloudOff,
  Cloud,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import {
  useOnlineStatus,
  useServiceWorker,
  useBackgroundSync,
  useStorageEstimate
} from '@/hooks/use-offline'

// ============================================
// Types
// ============================================

interface OfflineIndicatorProps {
  className?: string
  showDetails?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline'
  compact?: boolean
}

interface OfflineBannerProps {
  className?: string
  dismissible?: boolean
  onDismiss?: () => void
}

interface SyncStatusProps {
  className?: string
}

// ============================================
// OfflineIndicator Component
// ============================================

export function OfflineIndicator({
  className,
  showDetails = true,
  position = 'bottom-right',
  compact = false
}: OfflineIndicatorProps) {
  const { isOnline, isOffline, connectionType, effectiveType } = useOnlineStatus()
  const { updateAvailable, skipWaiting } = useServiceWorker()
  const { getPendingCount, processSyncQueue, isProcessing } = useBackgroundSync()
  const storageEstimate = useStorageEstimate()
  
  const [pendingCount, setPendingCount] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)

  // Update pending count
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }
    updateCount()
    
    const interval = setInterval(updateCount, 5000)
    return () => clearInterval(interval)
  }, [getPendingCount])

  // Show update notification
  useEffect(() => {
    if (updateAvailable) {
      setShowUpdateNotification(true)
    }
  }, [updateAvailable])

  // Position styles
  const positionStyles = {
    'top-left': 'fixed top-4 left-4 z-50',
    'top-right': 'fixed top-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'inline': ''
  }

  // If online and no pending, show minimal indicator
  if (isOnline && pendingCount === 0 && !updateAvailable && !showDetails) {
    return null
  }

  const handleSync = async () => {
    await processSyncQueue()
    const count = await getPendingCount()
    setPendingCount(count)
  }

  const handleUpdate = () => {
    skipWaiting()
    window.location.reload()
  }

  return (
    <div className={cn(positionStyles[position], className)}>
      <AnimatePresence>
        {/* Update Available Notification */}
        {showUpdateNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-2 bg-blue-500 text-white rounded-lg p-3 shadow-lg flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm flex-1">Nova versão disponível</span>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={handleUpdate}
            >
              Atualizar
            </Button>
            <button
              onClick={() => setShowUpdateNotification(false)}
              className="p-1 hover:bg-white/20 rounded"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}

        {/* Main Indicator */}
        {(isOffline || pendingCount > 0 || showDetails) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {compact ? (
              <CompactIndicator
                isOnline={isOnline}
                pendingCount={pendingCount}
                isProcessing={isProcessing}
              />
            ) : (
              <Popover open={isExpanded} onOpenChange={setIsExpanded}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-colors',
                      isOffline
                        ? 'bg-amber-500 text-white'
                        : pendingCount > 0
                        ? 'bg-blue-500 text-white'
                        : 'bg-green-500 text-white'
                    )}
                  >
                    {isOffline ? (
                      <WifiOff className="h-4 w-4" />
                    ) : pendingCount > 0 ? (
                      <Cloud className="h-4 w-4" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                    
                    <span className="text-sm font-medium">
                      {isOffline
                        ? 'Offline'
                        : pendingCount > 0
                        ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`
                        : 'Online'}
                    </span>
                    
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-72 p-0"
                  align="end"
                  side="top"
                >
                  <div className="p-4 space-y-4">
                    {/* Connection Status */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-full',
                        isOnline ? 'bg-green-100' : 'bg-amber-100'
                      )}>
                        {isOnline ? (
                          <Wifi className="h-5 w-5 text-green-600" />
                        ) : (
                          <WifiOff className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {isOnline ? 'Conectado' : 'Sem conexão'}
                        </p>
                        {connectionType && (
                          <p className="text-xs text-muted-foreground">
                            {connectionType} • {effectiveType}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sync Status */}
                    {pendingCount > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            Sincronização pendente
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {pendingCount} item{pendingCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {isOnline && (
                          <Button
                            size="sm"
                            onClick={handleSync}
                            disabled={isProcessing}
                            className="w-full"
                          >
                            {isProcessing ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Sincronizando...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Sincronizar agora
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Storage Info */}
                    {storageEstimate && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <HardDrive className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Armazenamento local
                          </span>
                        </div>
                        <Progress
                          value={storageEstimate.percentUsed}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatBytes(storageEstimate.usage)} de {formatBytes(storageEstimate.quota)}
                        </p>
                      </div>
                    )}

                    {/* Offline Mode Info */}
                    {isOffline && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">
                              Modo offline ativo
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Suas alterações serão salvas localmente e sincronizadas quando a conexão for restaurada.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// Compact Indicator
// ============================================

function CompactIndicator({
  isOnline,
  pendingCount,
  isProcessing
}: {
  isOnline: boolean
  pendingCount: number
  isProcessing: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      isOnline
        ? pendingCount > 0
          ? 'bg-blue-100 text-blue-700'
          : 'bg-green-100 text-green-700'
        : 'bg-amber-100 text-amber-700'
    )}>
      {isProcessing ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : isOnline ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      
      {pendingCount > 0 && (
        <span>{pendingCount}</span>
      )}
    </div>
  )
}

// ============================================
// OfflineBanner Component
// ============================================

export function OfflineBanner({
  className,
  dismissible = true,
  onDismiss
}: OfflineBannerProps) {
  const { isOffline, wasOffline, isOnline } = useOnlineStatus()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  // Show reconnected notification
  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true)
      setIsDismissed(false)
      
      const timer = setTimeout(() => {
        setShowReconnected(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [wasOffline, isOnline])

  // Reset dismissed state when going offline
  useEffect(() => {
    if (isOffline) {
      setIsDismissed(false)
    }
  }, [isOffline])

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (isDismissed && !showReconnected) {
    return null
  }

  return (
    <AnimatePresence>
      {(isOffline || showReconnected) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={cn(
            'overflow-hidden',
            className
          )}
        >
          <div className={cn(
            'flex items-center justify-center gap-3 py-2 px-4 text-sm',
            showReconnected
              ? 'bg-green-500 text-white'
              : 'bg-amber-500 text-white'
          )}>
            {showReconnected ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Conexão restaurada! Sincronizando alterações...</span>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4" />
                <span>Você está offline. As alterações serão salvas localmente.</span>
              </>
            )}

            {dismissible && (
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// SyncStatus Component
// ============================================

export function SyncStatus({ className }: SyncStatusProps) {
  const { isOnline } = useOnlineStatus()
  const { getPendingCount, processSyncQueue, isProcessing, lastSyncAt } = useBackgroundSync()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }
    updateCount()
  }, [getPendingCount])

  if (pendingCount === 0 && !isProcessing) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Tudo sincronizado</span>
        {lastSyncAt && (
          <span className="text-xs">
            • {formatRelativeTime(lastSyncAt)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {isProcessing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-blue-600">Sincronizando...</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4 text-amber-500" />
          <span className="text-amber-600">
            {pendingCount} alteração{pendingCount > 1 ? 'ões' : ''} pendente{pendingCount > 1 ? 's' : ''}
          </span>
          {isOnline && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={processSyncQueue}
            >
              Sincronizar
            </Button>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Utilities
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `há ${diffMins}min`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `há ${diffHours}h`
  
  const diffDays = Math.floor(diffHours / 24)
  return `há ${diffDays}d`
}

// ============================================
// Exports
// ============================================

export default OfflineIndicator
