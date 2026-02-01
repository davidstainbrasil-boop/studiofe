'use client'

/**
 * 📜 Project Version History Hook
 * 
 * Manages project versioning with:
 * - Auto-save with debounce
 * - Manual snapshots
 * - Version comparison
 * - Restore functionality
 * - Version branching
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useOfflineStorage } from './use-offline'

// ============================================
// Types
// ============================================

export interface ProjectVersion {
  id: string
  projectId: string
  version: number
  label?: string
  description?: string
  createdAt: Date
  createdBy?: string
  snapshot: ProjectSnapshot
  parentVersionId?: string
  tags: string[]
  isAutoSave: boolean
  size: number // bytes
}

export interface ProjectSnapshot {
  slides: SlideSnapshot[]
  settings: ProjectSettings
  metadata: ProjectMetadata
  assets: AssetReference[]
}

export interface SlideSnapshot {
  id: string
  order: number
  duration: number
  elements: ElementSnapshot[]
  transitions: TransitionConfig
  notes?: string
  thumbnail?: string
}

export interface ElementSnapshot {
  id: string
  type: 'text' | 'image' | 'video' | 'audio' | 'shape' | 'avatar'
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  opacity: number
  zIndex: number
  locked: boolean
  visible: boolean
  properties: Record<string, unknown>
}

export interface TransitionConfig {
  type: string
  duration: number
  easing: string
}

export interface ProjectSettings {
  resolution: { width: number; height: number }
  fps: number
  backgroundColor: string
  audioSettings: AudioSettings
}

export interface AudioSettings {
  masterVolume: number
  backgroundMusic?: string
  voiceOver?: string
}

export interface ProjectMetadata {
  name: string
  createdAt: Date
  updatedAt: Date
  author?: string
  tags: string[]
}

export interface AssetReference {
  id: string
  type: 'image' | 'video' | 'audio' | 'font'
  url: string
  name: string
  size: number
}

export interface VersionDiff {
  added: DiffItem[]
  removed: DiffItem[]
  modified: DiffItem[]
}

export interface DiffItem {
  type: 'slide' | 'element' | 'setting' | 'asset'
  id: string
  path: string
  oldValue?: unknown
  newValue?: unknown
}

export interface VersionHistoryState {
  versions: ProjectVersion[]
  currentVersionId: string | null
  isLoading: boolean
  error: Error | null
  hasUnsavedChanges: boolean
}

export interface UseVersionHistoryOptions {
  projectId: string
  maxVersions?: number
  autoSaveInterval?: number // ms, 0 to disable
  autoSaveDebounce?: number // ms
  onVersionCreated?: (version: ProjectVersion) => void
  onVersionRestored?: (version: ProjectVersion) => void
  onError?: (error: Error) => void
}

// ============================================
// Constants
// ============================================

const DEFAULT_MAX_VERSIONS = 50
const DEFAULT_AUTO_SAVE_INTERVAL = 5 * 60 * 1000 // 5 minutes
const DEFAULT_AUTO_SAVE_DEBOUNCE = 30 * 1000 // 30 seconds

// ============================================
// Main Hook
// ============================================

export function useVersionHistory(options: UseVersionHistoryOptions) {
  const {
    projectId,
    maxVersions = DEFAULT_MAX_VERSIONS,
    autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL,
    autoSaveDebounce = DEFAULT_AUTO_SAVE_DEBOUNCE,
    onVersionCreated,
    onVersionRestored,
    onError
  } = options

  const storage = useOfflineStorage<ProjectVersion>('projects')
  
  const [state, setState] = useState<VersionHistoryState>({
    versions: [],
    currentVersionId: null,
    isLoading: true,
    error: null,
    hasUnsavedChanges: false
  })

  const lastSnapshotRef = useRef<string | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ==========================================
  // Load versions on mount
  // ==========================================

  useEffect(() => {
    loadVersions()
    
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [projectId])

  const loadVersions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const allVersions = await storage.getAll()
      const projectVersions = allVersions
        .filter(v => v.projectId === projectId)
        .sort((a, b) => b.version - a.version)
      
      const currentVersion = projectVersions[0] || null
      
      setState(prev => ({
        ...prev,
        versions: projectVersions,
        currentVersionId: currentVersion?.id || null,
        isLoading: false
      }))

      if (currentVersion) {
        lastSnapshotRef.current = JSON.stringify(currentVersion.snapshot)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to load versions')
      setState(prev => ({ ...prev, error: err, isLoading: false }))
      onError?.(err)
    }
  }, [projectId, storage, onError])

  // ==========================================
  // Create new version
  // ==========================================

  const createVersion = useCallback(async (
    snapshot: ProjectSnapshot,
    options: {
      label?: string
      description?: string
      tags?: string[]
      isAutoSave?: boolean
    } = {}
  ): Promise<ProjectVersion | null> => {
    const { label, description, tags = [], isAutoSave = false } = options

    try {
      const currentVersion = state.versions[0]
      const newVersionNumber = currentVersion ? currentVersion.version + 1 : 1
      
      const snapshotString = JSON.stringify(snapshot)
      
      // Skip if snapshot hasn't changed (for auto-save)
      if (isAutoSave && lastSnapshotRef.current === snapshotString) {
        return null
      }

      const newVersion: ProjectVersion = {
        id: generateVersionId(),
        projectId,
        version: newVersionNumber,
        label: label || `Versão ${newVersionNumber}`,
        description,
        createdAt: new Date(),
        snapshot,
        parentVersionId: currentVersion?.id,
        tags,
        isAutoSave,
        size: new Blob([snapshotString]).size
      }

      await storage.set(newVersion.id, newVersion)
      
      // Update state
      setState(prev => {
        let versions = [newVersion, ...prev.versions]
        
        // Trim old versions if exceeding max
        if (versions.length > maxVersions) {
          // Keep manual versions, trim auto-saves first
          const manual = versions.filter(v => !v.isAutoSave)
          const auto = versions.filter(v => v.isAutoSave)
          
          if (auto.length > maxVersions / 2) {
            auto.splice(Math.floor(maxVersions / 2))
          }
          
          versions = [...manual, ...auto]
            .sort((a, b) => b.version - a.version)
            .slice(0, maxVersions)
        }
        
        return {
          ...prev,
          versions,
          currentVersionId: newVersion.id,
          hasUnsavedChanges: false
        }
      })

      lastSnapshotRef.current = snapshotString
      onVersionCreated?.(newVersion)
      
      return newVersion
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create version')
      onError?.(err)
      return null
    }
  }, [projectId, state.versions, storage, maxVersions, onVersionCreated, onError])

  // ==========================================
  // Restore version
  // ==========================================

  const restoreVersion = useCallback(async (
    versionId: string
  ): Promise<ProjectSnapshot | null> => {
    try {
      const version = state.versions.find(v => v.id === versionId)
      if (!version) {
        throw new Error('Version not found')
      }

      // Create a restore point before restoring
      const currentVersion = state.versions[0]
      if (currentVersion && currentVersion.id !== versionId) {
        await createVersion(currentVersion.snapshot, {
          label: `Antes de restaurar para v${version.version}`,
          description: `Auto-save antes de restaurar para "${version.label}"`,
          isAutoSave: true
        })
      }

      setState(prev => ({
        ...prev,
        currentVersionId: versionId,
        hasUnsavedChanges: false
      }))

      lastSnapshotRef.current = JSON.stringify(version.snapshot)
      onVersionRestored?.(version)
      
      return version.snapshot
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to restore version')
      onError?.(err)
      return null
    }
  }, [state.versions, createVersion, onVersionRestored, onError])

  // ==========================================
  // Delete version
  // ==========================================

  const deleteVersion = useCallback(async (versionId: string): Promise<boolean> => {
    try {
      // Don't delete current version
      if (versionId === state.currentVersionId) {
        throw new Error('Cannot delete current version')
      }

      await storage.remove(versionId)
      
      setState(prev => ({
        ...prev,
        versions: prev.versions.filter(v => v.id !== versionId)
      }))
      
      return true
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to delete version')
      onError?.(err)
      return false
    }
  }, [state.currentVersionId, storage, onError])

  // ==========================================
  // Update version metadata
  // ==========================================

  const updateVersionMetadata = useCallback(async (
    versionId: string,
    updates: { label?: string; description?: string; tags?: string[] }
  ): Promise<boolean> => {
    try {
      const version = state.versions.find(v => v.id === versionId)
      if (!version) return false

      const updatedVersion: ProjectVersion = {
        ...version,
        ...updates
      }

      await storage.set(versionId, updatedVersion)
      
      setState(prev => ({
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId ? updatedVersion : v
        )
      }))
      
      return true
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to update version'))
      return false
    }
  }, [state.versions, storage, onError])

  // ==========================================
  // Compare versions
  // ==========================================

  const compareVersions = useCallback((
    versionIdA: string,
    versionIdB: string
  ): VersionDiff | null => {
    const versionA = state.versions.find(v => v.id === versionIdA)
    const versionB = state.versions.find(v => v.id === versionIdB)
    
    if (!versionA || !versionB) return null

    const diff: VersionDiff = {
      added: [],
      removed: [],
      modified: []
    }

    // Compare slides
    const slidesA = new Map(versionA.snapshot.slides.map(s => [s.id, s]))
    const slidesB = new Map(versionB.snapshot.slides.map(s => [s.id, s]))

    // Find added slides
    slidesB.forEach((slide, id) => {
      if (!slidesA.has(id)) {
        diff.added.push({
          type: 'slide',
          id,
          path: `slides.${id}`,
          newValue: slide
        })
      }
    })

    // Find removed slides
    slidesA.forEach((slide, id) => {
      if (!slidesB.has(id)) {
        diff.removed.push({
          type: 'slide',
          id,
          path: `slides.${id}`,
          oldValue: slide
        })
      }
    })

    // Find modified slides
    slidesA.forEach((slideA, id) => {
      const slideB = slidesB.get(id)
      if (slideB && JSON.stringify(slideA) !== JSON.stringify(slideB)) {
        diff.modified.push({
          type: 'slide',
          id,
          path: `slides.${id}`,
          oldValue: slideA,
          newValue: slideB
        })
      }
    })

    // Compare settings
    if (JSON.stringify(versionA.snapshot.settings) !== JSON.stringify(versionB.snapshot.settings)) {
      diff.modified.push({
        type: 'setting',
        id: 'settings',
        path: 'settings',
        oldValue: versionA.snapshot.settings,
        newValue: versionB.snapshot.settings
      })
    }

    return diff
  }, [state.versions])

  // ==========================================
  // Auto-save functionality
  // ==========================================

  const scheduleAutoSave = useCallback((snapshot: ProjectSnapshot) => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Mark as having unsaved changes
    setState(prev => ({ ...prev, hasUnsavedChanges: true }))

    // Schedule debounced save
    debounceTimerRef.current = setTimeout(() => {
      createVersion(snapshot, { isAutoSave: true })
    }, autoSaveDebounce)
  }, [createVersion, autoSaveDebounce])

  // Setup auto-save interval
  useEffect(() => {
    if (autoSaveInterval <= 0) return

    autoSaveTimerRef.current = setInterval(() => {
      // This would typically get the current snapshot from the editor
      // For now, just trigger a check
      setState(prev => prev)
    }, autoSaveInterval)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [autoSaveInterval])

  // ==========================================
  // Get version by ID
  // ==========================================

  const getVersion = useCallback((versionId: string): ProjectVersion | undefined => {
    return state.versions.find(v => v.id === versionId)
  }, [state.versions])

  // ==========================================
  // Get current version
  // ==========================================

  const currentVersion = useMemo(() => {
    return state.versions.find(v => v.id === state.currentVersionId)
  }, [state.versions, state.currentVersionId])

  // ==========================================
  // Stats
  // ==========================================

  const stats = useMemo(() => {
    const totalSize = state.versions.reduce((sum, v) => sum + v.size, 0)
    const autoSaveCount = state.versions.filter(v => v.isAutoSave).length
    const manualCount = state.versions.length - autoSaveCount
    
    return {
      totalVersions: state.versions.length,
      autoSaveCount,
      manualCount,
      totalSize,
      oldestVersion: state.versions[state.versions.length - 1],
      newestVersion: state.versions[0]
    }
  }, [state.versions])

  return {
    // State
    versions: state.versions,
    currentVersion,
    currentVersionId: state.currentVersionId,
    isLoading: state.isLoading,
    error: state.error,
    hasUnsavedChanges: state.hasUnsavedChanges,
    stats,

    // Actions
    createVersion,
    restoreVersion,
    deleteVersion,
    updateVersionMetadata,
    compareVersions,
    getVersion,
    scheduleAutoSave,
    refresh: loadVersions
  }
}

// ============================================
// Utilities
// ============================================

function generateVersionId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================
// Exports
// ============================================

export default useVersionHistory
