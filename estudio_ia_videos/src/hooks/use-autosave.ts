'use client';

import { useEffect, useState, useRef } from 'react';
import { useTimelineStore } from '@lib/stores/timeline-store';
import { logger } from '@lib/logger';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutosaveOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutosave(options: AutosaveOptions = {}) {
  const { debounceMs = 3000, enabled = true } = options;
  
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const project = useTimelineStore(state => state.project);
  const projectId = useTimelineStore(state => state.projectId);
  const setProjectId = useTimelineStore(state => state.setProjectId);
  const exportSnapshot = useTimelineStore(state => state.exportSnapshot);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSnapshotRef = useRef<string>('');

  // Manual save function
  const saveNow = async () => {
    if (!project) {
      logger.warn('No project to save', { component: 'useAutosave' });
      return;
    }

    setStatus('saving');
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar');
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
      logger.info('Project saved', { projectId: result.projectId });

      // Reset to idle after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);

    } catch (err) {
      logger.error('Save error', err as Error);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStatus('error');
    }
  };

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
  }, [project, enabled, debounceMs]);

  return {
    status,
    error,
    saveNow
  };
}
