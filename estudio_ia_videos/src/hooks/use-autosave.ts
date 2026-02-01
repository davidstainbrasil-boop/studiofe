'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { logger } from '@lib/logger';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'retrying';

interface AutosaveOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutosave(options: AutosaveOptions = {}) {
  const { debounceMs = 3000, enabled = true } = options;
  
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  const project = useTimelineStore(state => state.project);
  const projectId = useTimelineStore(state => state.projectId);
  const setProjectId = useTimelineStore(state => state.setProjectId);
  const exportSnapshot = useTimelineStore(state => state.exportSnapshot);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSnapshotRef = useRef<string>('');
  
  // Retry configuration
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000;

  // Derived states for backwards compatibility
  const isSaving = status === 'saving' || status === 'retrying';

  // Manual save function with improved retry logic
  const saveNow = useCallback(async (retryCount = 0) => {
    if (!project) {
      logger.warn('No project to save', { component: 'useAutosave' });
      return;
    }

    setStatus(retryCount > 0 ? 'retrying' : 'saving');
    setError(null);

    try {
      const snapshot = exportSnapshot();
      
      const response = await fetch('/api/studio/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          name: project.name,
          snapshot
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao salvar: ${response.status}`);
      }

      const result = await response.json();
      
      // Update projectId if it was a new project
      if (!projectId && result.projectId) {
        setProjectId(result.projectId);
        
        // Update URL with projectId
        const url = new URL(window.location.href);
        url.searchParams.set('projectId', result.projectId);
        window.history.replaceState({}, '', url.toString());
      }

      setStatus('saved');
      setLastSavedAt(new Date());
      logger.info('Project saved', { projectId: result.projectId, version: result.version });

      // Reset to idle after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Save error', err as Error, { retryCount });

      if (retryCount < MAX_RETRIES) {
        // Exponential backoff
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        logger.info(`Retrying save in ${delay}ms...`, { retryCount: retryCount + 1 });
        
        setTimeout(() => {
          saveNow(retryCount + 1);
        }, delay);
      } else {
        setError(errorMessage);
        setStatus('error');
      }
    }
  }, [project, projectId, exportSnapshot, setProjectId]);

  // Alias for backwards compatibility
  const saveProject = saveNow;

  // Autosave effect
  useEffect(() => {
    if (!enabled || !project) return;

    // Generate snapshot hash to detect changes
    const snapshot = exportSnapshot();
    const snapshotHash = JSON.stringify(snapshot);

    // Skip if no changes
    if (snapshotHash === lastSnapshotRef.current) {
      return;
    }

    lastSnapshotRef.current = snapshotHash;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      saveNow();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [project, enabled, debounceMs, exportSnapshot, saveNow]);

  return {
    status,
    error,
    saveNow,
    saveProject,
    isSaving,
    lastSavedAt
  };
}
