'use client'

/**
 * 🔌 Offline Support Hooks
 * 
 * Provides offline detection, IndexedDB storage, and sync capabilities:
 * - useOnlineStatus - Detect network status
 * - useOfflineStorage - IndexedDB for local data
 * - useBackgroundSync - Sync when back online
 * - useServiceWorker - SW registration and updates
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ============================================
// Types
// ============================================

export interface OfflineStatus {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
  lastOnline: Date | null
  connectionType: string | null
  effectiveType: string | null
  downlink: number | null
  rtt: number | null
}

export interface ServiceWorkerStatus {
  isSupported: boolean
  isRegistered: boolean
  isReady: boolean
  registration: ServiceWorkerRegistration | null
  updateAvailable: boolean
  error: Error | null
}

export interface StorageEstimate {
  quota: number
  usage: number
  usageDetails?: Record<string, number>
  percentUsed: number
}

export interface SyncQueueItem {
  id: string
  type: 'project' | 'asset' | 'settings' | 'analytics'
  action: 'create' | 'update' | 'delete'
  data: unknown
  timestamp: number
  retries: number
  maxRetries: number
}

export interface OfflineProject {
  id: string
  name: string
  slides: unknown[]
  config: unknown
  updatedAt: number
  syncedAt: number | null
  isDirty: boolean
}

// ============================================
// IndexedDB Setup
// ============================================

const DB_NAME = 'tecnico-cursos-offline'
const DB_VERSION = 1

const STORES = {
  projects: 'projects',
  assets: 'assets',
  syncQueue: 'syncQueue',
  settings: 'settings',
  cache: 'cache'
} as const

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Projects store
      if (!db.objectStoreNames.contains(STORES.projects)) {
        const projectStore = db.createObjectStore(STORES.projects, { keyPath: 'id' })
        projectStore.createIndex('updatedAt', 'updatedAt')
        projectStore.createIndex('isDirty', 'isDirty')
      }

      // Assets store (for offline media)
      if (!db.objectStoreNames.contains(STORES.assets)) {
        const assetStore = db.createObjectStore(STORES.assets, { keyPath: 'id' })
        assetStore.createIndex('type', 'type')
        assetStore.createIndex('projectId', 'projectId')
      }

      // Sync queue store
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const syncStore = db.createObjectStore(STORES.syncQueue, { keyPath: 'id' })
        syncStore.createIndex('type', 'type')
        syncStore.createIndex('timestamp', 'timestamp')
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' })
      }

      // Cache store (for API responses)
      if (!db.objectStoreNames.contains(STORES.cache)) {
        const cacheStore = db.createObjectStore(STORES.cache, { keyPath: 'url' })
        cacheStore.createIndex('expiresAt', 'expiresAt')
      }
    }
  })
}

// ============================================
// useOnlineStatus Hook
// ============================================

export function useOnlineStatus(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    wasOffline: false,
    lastOnline: null,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null
  }))

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
      
      setStatus(prev => ({
        ...prev,
        connectionType: connection?.type || null,
        effectiveType: connection?.effectiveType || null,
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null
      }))
    }

    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        isOffline: false,
        wasOffline: prev.isOffline,
        lastOnline: new Date()
      }))
      updateNetworkInfo()
    }

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isOffline: true
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo)
    }

    // Initial update
    updateNetworkInfo()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  return status
}

// ============================================
// useServiceWorker Hook
// ============================================

export function useServiceWorker(): ServiceWorkerStatus & {
  register: () => Promise<void>
  update: () => Promise<void>
  unregister: () => Promise<void>
  skipWaiting: () => void
} {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    isRegistered: false,
    isReady: false,
    registration: null,
    updateAvailable: false,
    error: null
  })

  const register = useCallback(async () => {
    if (!status.isSupported) return

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      setStatus(prev => ({
        ...prev,
        isRegistered: true,
        registration,
        error: null
      }))

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setStatus(prev => ({ ...prev, updateAvailable: true }))
            }
          })
        }
      })

      // Wait for ready
      await navigator.serviceWorker.ready
      setStatus(prev => ({ ...prev, isReady: true }))

    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Registration failed')
      }))
    }
  }, [status.isSupported])

  const update = useCallback(async () => {
    if (status.registration) {
      await status.registration.update()
    }
  }, [status.registration])

  const unregister = useCallback(async () => {
    if (status.registration) {
      await status.registration.unregister()
      setStatus(prev => ({
        ...prev,
        isRegistered: false,
        isReady: false,
        registration: null
      }))
    }
  }, [status.registration])

  const skipWaiting = useCallback(() => {
    if (status.registration?.waiting) {
      status.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [status.registration])

  // Auto-register on mount
  useEffect(() => {
    if (status.isSupported && !status.isRegistered) {
      register()
    }
  }, [status.isSupported, status.isRegistered, register])

  return {
    ...status,
    register,
    update,
    unregister,
    skipWaiting
  }
}

// ============================================
// useOfflineStorage Hook
// ============================================

export function useOfflineStorage<T>(
  storeName: keyof typeof STORES = 'cache'
): {
  get: (key: string) => Promise<T | undefined>
  set: (key: string, value: T) => Promise<void>
  remove: (key: string) => Promise<void>
  getAll: () => Promise<T[]>
  clear: () => Promise<void>
  isSupported: boolean
} {
  const dbRef = useRef<IDBDatabase | null>(null)
  const [isSupported] = useState(() => typeof indexedDB !== 'undefined')

  const ensureDb = useCallback(async () => {
    if (!isSupported) return null
    if (!dbRef.current) {
      dbRef.current = await openDatabase()
    }
    return dbRef.current
  }, [isSupported])

  const get = useCallback(async (key: string): Promise<T | undefined> => {
    const db = await ensureDb()
    if (!db) return undefined

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }, [ensureDb, storeName])

  const set = useCallback(async (key: string, value: T): Promise<void> => {
    const db = await ensureDb()
    if (!db) return

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put({ ...value, id: key })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }, [ensureDb, storeName])

  const remove = useCallback(async (key: string): Promise<void> => {
    const db = await ensureDb()
    if (!db) return

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }, [ensureDb, storeName])

  const getAll = useCallback(async (): Promise<T[]> => {
    const db = await ensureDb()
    if (!db) return []

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }, [ensureDb, storeName])

  const clear = useCallback(async (): Promise<void> => {
    const db = await ensureDb()
    if (!db) return

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }, [ensureDb, storeName])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dbRef.current?.close()
    }
  }, [])

  return {
    get,
    set,
    remove,
    getAll,
    clear,
    isSupported
  }
}

// ============================================
// useOfflineProjects Hook
// ============================================

export function useOfflineProjects(): {
  projects: OfflineProject[]
  saveProject: (project: OfflineProject) => Promise<void>
  loadProject: (id: string) => Promise<OfflineProject | undefined>
  deleteProject: (id: string) => Promise<void>
  getDirtyProjects: () => Promise<OfflineProject[]>
  markSynced: (id: string) => Promise<void>
  isLoading: boolean
} {
  const storage = useOfflineStorage<OfflineProject>('projects')
  const [projects, setProjects] = useState<OfflineProject[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true)
      try {
        const allProjects = await storage.getAll()
        setProjects(allProjects)
      } catch (error) {
        console.error('Failed to load offline projects:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProjects()
  }, [storage])

  const saveProject = useCallback(async (project: OfflineProject) => {
    await storage.set(project.id, {
      ...project,
      updatedAt: Date.now(),
      isDirty: true
    })
    
    setProjects(prev => {
      const index = prev.findIndex(p => p.id === project.id)
      if (index >= 0) {
        const updated = [...prev]
        updated[index] = project
        return updated
      }
      return [...prev, project]
    })
  }, [storage])

  const loadProject = useCallback(async (id: string) => {
    return storage.get(id)
  }, [storage])

  const deleteProject = useCallback(async (id: string) => {
    await storage.remove(id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [storage])

  const getDirtyProjects = useCallback(async () => {
    const allProjects = await storage.getAll()
    return allProjects.filter(p => p.isDirty)
  }, [storage])

  const markSynced = useCallback(async (id: string) => {
    const project = await storage.get(id)
    if (project) {
      await storage.set(id, {
        ...project,
        syncedAt: Date.now(),
        isDirty: false
      })
      
      setProjects(prev => 
        prev.map(p => p.id === id ? { ...p, syncedAt: Date.now(), isDirty: false } : p)
      )
    }
  }, [storage])

  return {
    projects,
    saveProject,
    loadProject,
    deleteProject,
    getDirtyProjects,
    markSynced,
    isLoading
  }
}

// ============================================
// useBackgroundSync Hook
// ============================================

export function useBackgroundSync(): {
  queueSync: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) => Promise<void>
  processSyncQueue: () => Promise<void>
  getPendingCount: () => Promise<number>
  clearQueue: () => Promise<void>
  isProcessing: boolean
  lastSyncAt: Date | null
} {
  const storage = useOfflineStorage<SyncQueueItem>('syncQueue')
  const onlineStatus = useOnlineStatus()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)

  const queueSync = useCallback(async (
    item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>
  ) => {
    const syncItem: SyncQueueItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: item.maxRetries || 3
    }

    await storage.set(syncItem.id, syncItem)

    // Try to register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
          .sync.register(`sync-${item.type}`)
      } catch (error) {
        console.warn('Background sync registration failed:', error)
      }
    }
  }, [storage])

  const processSyncQueue = useCallback(async () => {
    if (!onlineStatus.isOnline || isProcessing) return

    setIsProcessing(true)
    
    try {
      const queue = await storage.getAll()
      const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp)

      for (const item of sortedQueue) {
        if (item.retries >= item.maxRetries) {
          // Max retries reached, remove from queue
          await storage.remove(item.id)
          continue
        }

        try {
          const endpoint = `/api/sync/${item.type}`
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: item.action,
              data: item.data
            })
          })

          if (response.ok) {
            await storage.remove(item.id)
          } else if (response.status >= 500) {
            // Server error, increment retries
            await storage.set(item.id, {
              ...item,
              retries: item.retries + 1
            })
          } else {
            // Client error, remove from queue
            await storage.remove(item.id)
          }
        } catch (error) {
          // Network error, increment retries
          await storage.set(item.id, {
            ...item,
            retries: item.retries + 1
          })
        }
      }

      setLastSyncAt(new Date())
    } finally {
      setIsProcessing(false)
    }
  }, [onlineStatus.isOnline, isProcessing, storage])

  const getPendingCount = useCallback(async () => {
    const queue = await storage.getAll()
    return queue.length
  }, [storage])

  const clearQueue = useCallback(async () => {
    await storage.clear()
  }, [storage])

  // Auto-sync when coming back online
  useEffect(() => {
    if (onlineStatus.wasOffline && onlineStatus.isOnline) {
      processSyncQueue()
    }
  }, [onlineStatus.wasOffline, onlineStatus.isOnline, processSyncQueue])

  return {
    queueSync,
    processSyncQueue,
    getPendingCount,
    clearQueue,
    isProcessing,
    lastSyncAt
  }
}

// ============================================
// useStorageEstimate Hook
// ============================================

export function useStorageEstimate(): StorageEstimate | null {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)

  useEffect(() => {
    const getEstimate = async () => {
      if (!navigator.storage || !navigator.storage.estimate) {
        return
      }

      try {
        const storageEstimate = await navigator.storage.estimate()
        // usageDetails is not part of the standard StorageEstimate type but some browsers support it
        const details = (storageEstimate as unknown as { usageDetails?: Record<string, number> }).usageDetails
        setEstimate({
          quota: storageEstimate.quota || 0,
          usage: storageEstimate.usage || 0,
          usageDetails: details,
          percentUsed: storageEstimate.quota 
            ? (storageEstimate.usage || 0) / storageEstimate.quota * 100 
            : 0
        })
      } catch (error) {
        console.error('Failed to get storage estimate:', error)
      }
    }

    getEstimate()
  }, [])

  return estimate
}

// ============================================
// Type Definitions for Network API
// ============================================

interface NetworkInformation extends EventTarget {
  type?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

export default useOnlineStatus
