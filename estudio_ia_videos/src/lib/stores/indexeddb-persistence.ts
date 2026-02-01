/**
 * 🗄️ IndexedDB Persistence for Unified Studio Store
 * 
 * Persiste o estado do editor offline usando IndexedDB via `idb-keyval`.
 * Suporta:
 * - Auto-save a cada N segundos
 * - Recuperação de crash
 * - Sincronização com estado remoto
 * - Versionamento para migrations
 */

import { openDB, IDBPDatabase } from 'idb';
import { StateStorage } from 'zustand/middleware';
import { logger } from '@/lib/logger';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'studio-persistence';
const DB_VERSION = 1;
const STORE_NAME = 'studio-state';
const STATE_KEY = 'unified-studio-state';
const AUTOSAVE_DEBOUNCE_MS = 2000;

// ============================================================================
// IndexedDB Setup
// ============================================================================

interface StudioDBSchema {
  'studio-state': {
    key: string;
    value: {
      state: unknown;
      version: number;
      updatedAt: string;
      projectId?: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<StudioDBSchema>> | null = null;

/**
 * Inicializa ou retorna a instância do IndexedDB
 */
async function getDB(): Promise<IDBPDatabase<StudioDBSchema>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in browser');
  }

  if (!dbPromise) {
    dbPromise = openDB<StudioDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
      blocked() {
        logger.warn('IndexedDB blocked - close other tabs');
      },
      blocking() {
        logger.warn('IndexedDB blocking newer version');
      },
      terminated() {
        logger.error('IndexedDB connection terminated');
        dbPromise = null;
      },
    });
  }

  return dbPromise;
}

// ============================================================================
// Storage Implementation for Zustand
// ============================================================================

/**
 * Cria um storage adapter para IndexedDB compatível com zustand/persist
 */
export function createIndexedDBStorage(): StateStorage {
  return {
    async getItem(name: string): Promise<string | null> {
      try {
        if (typeof window === 'undefined') return null;

        const db = await getDB();
        const data = await db.get(STORE_NAME, name);

        if (!data) return null;

        // Return stringified state for zustand
        return JSON.stringify(data.state);
      } catch (error) {
        logger.error('IndexedDB getItem failed', error instanceof Error ? error : undefined, { name });
        return null;
      }
    },

    async setItem(name: string, value: string): Promise<void> {
      try {
        if (typeof window === 'undefined') return;

        const db = await getDB();
        const state = JSON.parse(value);

        await db.put(
          STORE_NAME,
          {
            state,
            version: DB_VERSION,
            updatedAt: new Date().toISOString(),
            projectId: state?.state?.projectId,
          },
          name
        );
      } catch (error) {
        logger.error('IndexedDB setItem failed', error instanceof Error ? error : undefined, { name });
      }
    },

    async removeItem(name: string): Promise<void> {
      try {
        if (typeof window === 'undefined') return;

        const db = await getDB();
        await db.delete(STORE_NAME, name);
      } catch (error) {
        logger.error('IndexedDB removeItem failed', error instanceof Error ? error : undefined, { name });
      }
    },
  };
}

// ============================================================================
// Direct State Operations
// ============================================================================

/**
 * Salva o estado diretamente no IndexedDB (bypass zustand persist)
 */
export async function saveStateToIndexedDB(
  state: unknown,
  projectId?: string
): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    const db = await getDB();
    const key = projectId ? `project:${projectId}` : STATE_KEY;

    await db.put(
      STORE_NAME,
      {
        state,
        version: DB_VERSION,
        updatedAt: new Date().toISOString(),
        projectId,
      },
      key
    );

    logger.info('State saved to IndexedDB', { projectId });
  } catch (error) {
    logger.error('Failed to save state to IndexedDB', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Carrega o estado diretamente do IndexedDB
 */
export async function loadStateFromIndexedDB<T>(
  projectId?: string
): Promise<T | null> {
  try {
    if (typeof window === 'undefined') return null;

    const db = await getDB();
    const key = projectId ? `project:${projectId}` : STATE_KEY;
    const data = await db.get(STORE_NAME, key);

    if (!data) return null;

    // Check version compatibility
    if (data.version !== DB_VERSION) {
      logger.warn('State version mismatch, may need migration', {
        stored: data.version,
        current: DB_VERSION,
      });
    }

    return data.state as T;
  } catch (error) {
    logger.error('Failed to load state from IndexedDB', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Remove o estado do IndexedDB
 */
export async function clearStateFromIndexedDB(projectId?: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    const db = await getDB();
    const key = projectId ? `project:${projectId}` : STATE_KEY;
    await db.delete(STORE_NAME, key);

    logger.info('State cleared from IndexedDB', { projectId });
  } catch (error) {
    logger.error('Failed to clear state from IndexedDB', error instanceof Error ? error : undefined);
  }
}

/**
 * Lista todos os projetos salvos no IndexedDB
 */
export async function listSavedProjects(): Promise<
  Array<{ projectId: string; updatedAt: string }>
> {
  try {
    if (typeof window === 'undefined') return [];

    const db = await getDB();
    const keys = await db.getAllKeys(STORE_NAME);

    const projects: Array<{ projectId: string; updatedAt: string }> = [];

    for (const key of keys) {
      if (typeof key === 'string' && key.startsWith('project:')) {
        const data = await db.get(STORE_NAME, key);
        if (data?.projectId) {
          projects.push({
            projectId: data.projectId,
            updatedAt: data.updatedAt,
          });
        }
      }
    }

    return projects.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    logger.error('Failed to list saved projects', error instanceof Error ? error : undefined);
    return [];
  }
}

// ============================================================================
// Autosave Hook
// ============================================================================

/**
 * Hook para autosave com debounce
 */
export function createAutosaveMiddleware(debounceMs = AUTOSAVE_DEBOUNCE_MS) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (state: unknown, projectId?: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      try {
        await saveStateToIndexedDB(state, projectId);
        logger.info('Autosave completed', { projectId });
      } catch (error) {
        logger.error('Autosave failed', error instanceof Error ? error : undefined);
      }
    }, debounceMs);
  };
}

// ============================================================================
// Recovery Utilities
// ============================================================================

/**
 * Verifica se existe estado não salvo (recuperação de crash)
 */
export async function hasUnsavedState(projectId?: string): Promise<boolean> {
  try {
    const state = await loadStateFromIndexedDB(projectId);
    return state !== null;
  } catch {
    return false;
  }
}

/**
 * Exporta o estado para JSON (backup)
 */
export async function exportStateToJSON(projectId?: string): Promise<string | null> {
  const state = await loadStateFromIndexedDB(projectId);
  if (!state) return null;

  return JSON.stringify(
    {
      state,
      exportedAt: new Date().toISOString(),
      version: DB_VERSION,
    },
    null,
    2
  );
}

/**
 * Importa estado de JSON (restore)
 */
export async function importStateFromJSON(
  json: string,
  projectId?: string
): Promise<boolean> {
  try {
    const { state, version } = JSON.parse(json);

    if (version !== DB_VERSION) {
      logger.warn('Import version mismatch', { imported: version, current: DB_VERSION });
    }

    await saveStateToIndexedDB(state, projectId);
    return true;
  } catch (error) {
    logger.error('Failed to import state from JSON', error instanceof Error ? error : undefined);
    return false;
  }
}

// ============================================================================
// Export
// ============================================================================

export const indexedDBStorage = createIndexedDBStorage();

export default {
  storage: indexedDBStorage,
  save: saveStateToIndexedDB,
  load: loadStateFromIndexedDB,
  clear: clearStateFromIndexedDB,
  listProjects: listSavedProjects,
  hasUnsaved: hasUnsavedState,
  exportJSON: exportStateToJSON,
  importJSON: importStateFromJSON,
  createAutosave: createAutosaveMiddleware,
};
