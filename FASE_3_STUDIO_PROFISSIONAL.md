# FASE 3: STUDIO PROFISSIONAL (CONSOLIDAÇÃO + FEATURES)
**Duração:** 4 semanas (08/03 - 04/04)
**Prioridade:** ALTA 🔥
**Objetivo:** Editor de vídeo de classe profissional consolidado

---

## 📊 Visão Geral da Fase

### Problema Atual
- **7 implementações diferentes** de Timeline Editor
- **5 sistemas de Avatar** competindo
- **3 dashboards** sem integração
- Código fragmentado e difícil de manter

### Objetivos
1. ✅ **Consolidar em 1 editor único** - Professional Timeline Editor
2. ✅ Implementar **keyframes avançados** com easing
3. ✅ Sistema de **transições profissionais** (20+ effects)
4. ✅ **Color grading** com presets e LUTs
5. ✅ **Motion graphics templates** library
6. ✅ **Undo/Redo** funcional
7. ✅ **Export otimizado** com múltiplos formatos

### Stack Tecnológico
- **Konva.js** - Canvas manipulation (mantém)
- **Fabric.js** - Alternative canvas engine
- **GSAP** - Animações profissionais
- **Lottie** - Motion graphics
- **Three.js** - 3D effects
- **Remotion** - Video rendering

---

## Week 8: Consolidação de Código (CRÍTICO)

### Dia 31-32: Audit e Remoção

**Tarefa:** Identificar e remover código redundante

**Script de Análise:**
```bash
#!/bin/bash
# audit-editors.sh

echo "=== TIMELINE EDITORS AUDIT ==="

# Encontrar todos os timeline editors
find src/components/timeline -name "*.tsx" -type f | while read file; do
    lines=$(wc -l < "$file")
    echo "$file: $lines lines"
done

# Encontrar avatar systems
echo -e "\n=== AVATAR SYSTEMS AUDIT ==="
find src -name "*avatar*" -type f | grep -E "\.(tsx|ts)$" | while read file; do
    lines=$(wc -l < "$file")
    echo "$file: $lines lines"
done

# Encontrar dashboards
echo -e "\n=== DASHBOARD COMPONENTS AUDIT ==="
find src/components/dashboard -name "*.tsx" -type f | while read file; do
    lines=$(wc -l < "$file")
    echo "$file: $lines lines"
done
```

**Decisões de Consolidação:**

```typescript
// MANTER (ÚNICO):
/src/components/timeline/professional-timeline-editor.tsx  ✅

// REMOVER (REDUNDANTES):
/src/components/timeline/basic-timeline.tsx                ❌
/src/components/timeline/advanced-timeline-keyframes.tsx   ❌
/src/components/timeline/pptx-integrated-timeline.tsx      ❌
/src/components/timeline/timeline-v2.tsx                   ❌
/src/components/timeline/timeline-fabric.tsx               ❌
/src/components/timeline/simple-timeline.tsx               ❌

// AVATAR SYSTEMS - MANTER:
/src/app/avatar-studio/                                    ✅ (renomear de avatar-system-real)

// AVATAR SYSTEMS - REMOVER:
/src/components/avatars/talking-photo-basic.tsx            ❌
/src/components/avatars/talking-photo-advanced.tsx         ❌
/src/components/avatars/avatar-generator-v1.tsx            ❌
/src/components/avatars/avatar-generator-v2.tsx            ❌

// DASHBOARDS - MANTER:
/src/components/dashboard/unified-dashboard-real.tsx       ✅

// DASHBOARDS - REMOVER:
/src/components/dashboard/DashboardOverview.tsx            ❌ (apenas mock)
/src/components/dashboard/dashboard-real.tsx               ❌ (redundante)
/src/components/dashboard/sprint9-overview.tsx             ❌ (features Sprint 9 virão depois)
```

**Arquivo de Migração:**
```typescript
// migration-guide.md

## Migração de Componentes

### Timeline Editor
**Antes:**
import { BasicTimeline } from '@/components/timeline/basic-timeline'
import { AdvancedTimeline } from '@/components/timeline/advanced-timeline-keyframes'

**Depois:**
import { ProfessionalTimelineEditor } from '@/components/timeline/professional-timeline-editor'

### Avatar System
**Antes:**
import { TalkingPhotoBasic } from '@/components/avatars/talking-photo-basic'
import { AvatarGenerator } from '@/components/avatars/avatar-generator-v1'

**Depois:**
import { AvatarStudio } from '@/app/avatar-studio'

### Dashboard
**Antes:**
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { DashboardReal } from '@/components/dashboard/dashboard-real'

**Depois:**
import { UnifiedDashboard } from '@/components/dashboard/unified-dashboard-real'
```

### Dia 33-35: Refatoração do Professional Timeline Editor

**Arquivos a melhorar:**
- [ ] `/src/components/timeline/professional-timeline-editor.tsx` (refactor)
- [ ] `/src/lib/timeline/timeline-engine.ts` (novo)
- [ ] `/src/lib/timeline/keyframe-engine.ts` (novo)
- [ ] `/src/lib/timeline/track-manager.ts` (novo)

**Código: timeline-engine.ts**
```typescript
/**
 * Core Timeline Engine
 * Gerencia estado e operações da timeline de forma centralizada
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface TimelineElement {
  id: string
  type: 'video' | 'audio' | 'image' | 'text' | 'avatar' | 'shape'
  trackId: string
  startTime: number    // segundos
  duration: number     // segundos
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  opacity: number
  zIndex: number
  properties: Record<string, any>
  keyframes: Keyframe[]
}

export interface Keyframe {
  id: string
  elementId: string
  time: number         // tempo relativo ao elemento
  property: string     // 'opacity', 'position.x', 'rotation', etc
  value: any
  easing: EasingType
}

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'easeInOutBounce'

export interface Track {
  id: string
  name: string
  type: 'video' | 'audio' | 'overlay' | 'subtitle'
  locked: boolean
  muted: boolean
  visible: boolean
  height: number
  elements: string[]  // IDs dos elementos
}

export interface TimelineState {
  // Data
  tracks: Track[]
  elements: Record<string, TimelineElement>
  duration: number
  fps: number

  // Playback
  currentTime: number
  isPlaying: boolean
  loop: boolean

  // Selection
  selectedElements: string[]

  // History
  history: TimelineSnapshot[]
  historyIndex: number

  // Clipboard
  clipboard: TimelineElement[]

  // Actions
  addTrack: (track: Omit<Track, 'id'>) => void
  removeTrack: (trackId: string) => void
  updateTrack: (trackId: string, updates: Partial<Track>) => void

  addElement: (element: Omit<TimelineElement, 'id'>) => void
  removeElement: (elementId: string) => void
  updateElement: (elementId: string, updates: Partial<TimelineElement>) => void
  moveElement: (elementId: string, newTrackId: string, newStartTime: number) => void

  addKeyframe: (keyframe: Omit<Keyframe, 'id'>) => void
  removeKeyframe: (keyframeId: string) => void
  updateKeyframe: (keyframeId: string, updates: Partial<Keyframe>) => void

  setCurrentTime: (time: number) => void
  play: () => void
  pause: () => void
  stop: () => void

  selectElement: (elementId: string, addToSelection?: boolean) => void
  deselectAll: () => void

  copy: () => void
  paste: () => void
  cut: () => void
  duplicate: (elementId: string) => void

  undo: () => void
  redo: () => void

  exportTimeline: () => TimelineExport
  importTimeline: (data: TimelineExport) => void
}

interface TimelineSnapshot {
  tracks: Track[]
  elements: Record<string, TimelineElement>
  duration: number
}

interface TimelineExport {
  version: string
  tracks: Track[]
  elements: TimelineElement[]
  duration: number
  fps: number
  metadata: {
    createdAt: string
    lastModified: string
    author?: string
  }
}

export const useTimelineStore = create<TimelineState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        tracks: [],
        elements: {},
        duration: 60,
        fps: 30,
        currentTime: 0,
        isPlaying: false,
        loop: false,
        selectedElements: [],
        history: [],
        historyIndex: -1,
        clipboard: [],

        // Track operations
        addTrack: (track) => {
          const id = `track-${Date.now()}`
          const newTrack: Track = { ...track, id, elements: [] }

          set((state) => ({
            tracks: [...state.tracks, newTrack],
            history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
            historyIndex: state.historyIndex + 1
          }))
        },

        removeTrack: (trackId) => {
          set((state) => {
            // Remover elementos da track
            const track = state.tracks.find(t => t.id === trackId)
            if (!track) return state

            const elementsToRemove = track.elements
            const newElements = { ...state.elements }
            elementsToRemove.forEach(id => delete newElements[id])

            return {
              tracks: state.tracks.filter(t => t.id !== trackId),
              elements: newElements,
              history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
              historyIndex: state.historyIndex + 1
            }
          })
        },

        updateTrack: (trackId, updates) => {
          set((state) => ({
            tracks: state.tracks.map(t =>
              t.id === trackId ? { ...t, ...updates } : t
            )
          }))
        },

        // Element operations
        addElement: (element) => {
          const id = `element-${Date.now()}`
          const newElement: TimelineElement = {
            ...element,
            id,
            keyframes: []
          }

          set((state) => {
            const track = state.tracks.find(t => t.id === element.trackId)
            if (!track) return state

            return {
              elements: { ...state.elements, [id]: newElement },
              tracks: state.tracks.map(t =>
                t.id === element.trackId
                  ? { ...t, elements: [...t.elements, id] }
                  : t
              ),
              history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
              historyIndex: state.historyIndex + 1
            }
          })
        },

        removeElement: (elementId) => {
          set((state) => {
            const element = state.elements[elementId]
            if (!element) return state

            const newElements = { ...state.elements }
            delete newElements[elementId]

            return {
              elements: newElements,
              tracks: state.tracks.map(t =>
                t.id === element.trackId
                  ? { ...t, elements: t.elements.filter(id => id !== elementId) }
                  : t
              ),
              selectedElements: state.selectedElements.filter(id => id !== elementId),
              history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
              historyIndex: state.historyIndex + 1
            }
          })
        },

        updateElement: (elementId, updates) => {
          set((state) => ({
            elements: {
              ...state.elements,
              [elementId]: { ...state.elements[elementId], ...updates }
            }
          }))
        },

        moveElement: (elementId, newTrackId, newStartTime) => {
          set((state) => {
            const element = state.elements[elementId]
            if (!element) return state

            const oldTrackId = element.trackId

            return {
              elements: {
                ...state.elements,
                [elementId]: {
                  ...element,
                  trackId: newTrackId,
                  startTime: newStartTime
                }
              },
              tracks: state.tracks.map(t => {
                if (t.id === oldTrackId) {
                  return { ...t, elements: t.elements.filter(id => id !== elementId) }
                }
                if (t.id === newTrackId) {
                  return { ...t, elements: [...t.elements, elementId] }
                }
                return t
              }),
              history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
              historyIndex: state.historyIndex + 1
            }
          })
        },

        // Keyframe operations
        addKeyframe: (keyframe) => {
          const id = `keyframe-${Date.now()}`
          const newKeyframe: Keyframe = { ...keyframe, id }

          set((state) => {
            const element = state.elements[keyframe.elementId]
            if (!element) return state

            return {
              elements: {
                ...state.elements,
                [keyframe.elementId]: {
                  ...element,
                  keyframes: [...element.keyframes, newKeyframe]
                }
              },
              history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
              historyIndex: state.historyIndex + 1
            }
          })
        },

        removeKeyframe: (keyframeId) => {
          set((state) => {
            const elementId = Object.keys(state.elements).find(id =>
              state.elements[id].keyframes.some(kf => kf.id === keyframeId)
            )

            if (!elementId) return state

            const element = state.elements[elementId]

            return {
              elements: {
                ...state.elements,
                [elementId]: {
                  ...element,
                  keyframes: element.keyframes.filter(kf => kf.id !== keyframeId)
                }
              },
              history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
              historyIndex: state.historyIndex + 1
            }
          })
        },

        updateKeyframe: (keyframeId, updates) => {
          set((state) => {
            const elementId = Object.keys(state.elements).find(id =>
              state.elements[id].keyframes.some(kf => kf.id === keyframeId)
            )

            if (!elementId) return state

            const element = state.elements[elementId]

            return {
              elements: {
                ...state.elements,
                [elementId]: {
                  ...element,
                  keyframes: element.keyframes.map(kf =>
                    kf.id === keyframeId ? { ...kf, ...updates } : kf
                  )
                }
              }
            }
          })
        },

        // Playback controls
        setCurrentTime: (time) => set({ currentTime: Math.max(0, Math.min(time, get().duration)) }),

        play: () => set({ isPlaying: true }),
        pause: () => set({ isPlaying: false }),
        stop: () => set({ isPlaying: false, currentTime: 0 }),

        // Selection
        selectElement: (elementId, addToSelection = false) => {
          set((state) => ({
            selectedElements: addToSelection
              ? [...state.selectedElements, elementId]
              : [elementId]
          }))
        },

        deselectAll: () => set({ selectedElements: [] }),

        // Clipboard operations
        copy: () => {
          set((state) => {
            const elementsToCopy = state.selectedElements.map(id => state.elements[id])
            return { clipboard: elementsToCopy }
          })
        },

        paste: () => {
          set((state) => {
            if (state.clipboard.length === 0) return state

            const newElements: Record<string, TimelineElement> = {}
            const elementIds: string[] = []

            state.clipboard.forEach(element => {
              const id = `element-${Date.now()}-${Math.random()}`
              newElements[id] = {
                ...element,
                id,
                startTime: state.currentTime
              }
              elementIds.push(id)
            })

            // Adicionar à primeira track visível
            const targetTrack = state.tracks.find(t => t.visible && !t.locked)
            if (!targetTrack) return state

            return {
              elements: { ...state.elements, ...newElements },
              tracks: state.tracks.map(t =>
                t.id === targetTrack.id
                  ? { ...t, elements: [...t.elements, ...elementIds] }
                  : t
              ),
              selectedElements: elementIds,
              history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
              historyIndex: state.historyIndex + 1
            }
          })
        },

        cut: () => {
          const state = get()
          state.copy()
          state.selectedElements.forEach(id => state.removeElement(id))
        },

        duplicate: (elementId) => {
          set((state) => {
            const element = state.elements[elementId]
            if (!element) return state

            const id = `element-${Date.now()}`
            const duplicated: TimelineElement = {
              ...element,
              id,
              startTime: element.startTime + element.duration
            }

            return {
              elements: { ...state.elements, [id]: duplicated },
              tracks: state.tracks.map(t =>
                t.id === element.trackId
                  ? { ...t, elements: [...t.elements, id] }
                  : t
              ),
              selectedElements: [id],
              history: [...state.history.slice(0, state.historyIndex + 1), createSnapshot(state)],
              historyIndex: state.historyIndex + 1
            }
          })
        },

        // History operations
        undo: () => {
          set((state) => {
            if (state.historyIndex <= 0) return state

            const snapshot = state.history[state.historyIndex - 1]
            return {
              ...snapshot,
              historyIndex: state.historyIndex - 1
            }
          })
        },

        redo: () => {
          set((state) => {
            if (state.historyIndex >= state.history.length - 1) return state

            const snapshot = state.history[state.historyIndex + 1]
            return {
              ...snapshot,
              historyIndex: state.historyIndex + 1
            }
          })
        },

        // Export/Import
        exportTimeline: () => {
          const state = get()
          return {
            version: '1.0.0',
            tracks: state.tracks,
            elements: Object.values(state.elements),
            duration: state.duration,
            fps: state.fps,
            metadata: {
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString()
            }
          }
        },

        importTimeline: (data) => {
          const elementsMap: Record<string, TimelineElement> = {}
          data.elements.forEach(el => {
            elementsMap[el.id] = el
          })

          set({
            tracks: data.tracks,
            elements: elementsMap,
            duration: data.duration,
            fps: data.fps,
            currentTime: 0,
            selectedElements: [],
            history: [],
            historyIndex: -1
          })
        }
      }),
      {
        name: 'timeline-storage',
        partialize: (state) => ({
          tracks: state.tracks,
          elements: state.elements,
          duration: state.duration,
          fps: state.fps
        })
      }
    ),
    { name: 'TimelineStore' }
  )
)

function createSnapshot(state: TimelineState): TimelineSnapshot {
  return {
    tracks: state.tracks,
    elements: state.elements,
    duration: state.duration
  }
}
```

Continuo nos próximos arquivos...

**Código: keyframe-engine.ts**
```typescript
/**
 * Keyframe Animation Engine
 * Interpola valores entre keyframes com easing functions
 */

import { Keyframe, EasingType } from './timeline-engine'

export class KeyframeEngine {
  /**
   * Calcula valor interpolado no tempo especificado
   */
  interpolate(
    keyframes: Keyframe[],
    property: string,
    time: number
  ): any {
    // Filtrar keyframes da propriedade
    const propertyKeyframes = keyframes
      .filter(kf => kf.property === property)
      .sort((a, b) => a.time - b.time)

    if (propertyKeyframes.length === 0) {
      return undefined
    }

    // Apenas um keyframe - retornar valor
    if (propertyKeyframes.length === 1) {
      return propertyKeyframes[0].value
    }

    // Antes do primeiro keyframe
    if (time <= propertyKeyframes[0].time) {
      return propertyKeyframes[0].value
    }

    // Depois do último keyframe
    if (time >= propertyKeyframes[propertyKeyframes.length - 1].time) {
      return propertyKeyframes[propertyKeyframes.length - 1].value
    }

    // Encontrar keyframes anterior e próximo
    let startKf: Keyframe | null = null
    let endKf: Keyframe | null = null

    for (let i = 0; i < propertyKeyframes.length - 1; i++) {
      if (time >= propertyKeyframes[i].time && time <= propertyKeyframes[i + 1].time) {
        startKf = propertyKeyframes[i]
        endKf = propertyKeyframes[i + 1]
        break
      }
    }

    if (!startKf || !endKf) {
      return propertyKeyframes[0].value
    }

    // Calcular progresso (0-1)
    const duration = endKf.time - startKf.time
    const elapsed = time - startKf.time
    const progress = elapsed / duration

    // Aplicar easing
    const easedProgress = this.applyEasing(progress, startKf.easing)

    // Interpolar valor
    return this.interpolateValue(startKf.value, endKf.value, easedProgress)
  }

  /**
   * Interpola entre dois valores
   */
  private interpolateValue(start: any, end: any, progress: number): any {
    // Números
    if (typeof start === 'number' && typeof end === 'number') {
      return start + (end - start) * progress
    }

    // Objetos (position, size, etc)
    if (typeof start === 'object' && typeof end === 'object') {
      const result: any = {}
      Object.keys(start).forEach(key => {
        if (typeof start[key] === 'number' && typeof end[key] === 'number') {
          result[key] = start[key] + (end[key] - start[key]) * progress
        } else {
          result[key] = progress < 0.5 ? start[key] : end[key]
        }
      })
      return result
    }

    // Cores (hex)
    if (typeof start === 'string' && start.startsWith('#') && typeof end === 'string' && end.startsWith('#')) {
      return this.interpolateColor(start, end, progress)
    }

    // Default: step function
    return progress < 0.5 ? start : end
  }

  /**
   * Interpola cores em formato hex
   */
  private interpolateColor(startHex: string, endHex: string, progress: number): string {
    const startRgb = this.hexToRgb(startHex)
    const endRgb = this.hexToRgb(endHex)

    const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress)
    const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress)
    const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress)

    return this.rgbToHex(r, g, b)
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  /**
   * Aplica função de easing ao progresso
   */
  applyEasing(t: number, type: EasingType): number {
    switch (type) {
      case 'linear':
        return t

      case 'easeIn':
        return t * t

      case 'easeOut':
        return t * (2 - t)

      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

      case 'easeInBack':
        const c1 = 1.70158
        return t * t * ((c1 + 1) * t - c1)

      case 'easeOutBack':
        const c2 = 1.70158
        return 1 + (t - 1) * (t - 1) * ((c2 + 1) * (t - 1) + c2)

      case 'easeInOutBack':
        const c3 = 1.70158 * 1.525
        return t < 0.5
          ? (2 * t) * (2 * t) * ((c3 + 1) * 2 * t - c3) / 2
          : ((2 * t - 2) * (2 * t - 2) * ((c3 + 1) * (2 * t - 2) + c3) + 2) / 2

      case 'easeInElastic':
        const c4 = (2 * Math.PI) / 3
        return t === 0 ? 0 : t === 1 ? 1 :
          -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)

      case 'easeOutElastic':
        const c5 = (2 * Math.PI) / 3
        return t === 0 ? 0 : t === 1 ? 1 :
          Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c5) + 1

      case 'easeInOutElastic':
        const c6 = (2 * Math.PI) / 4.5
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
          ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c6)) / 2
          : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c6)) / 2 + 1

      case 'easeInBounce':
        return 1 - this.applyEasing(1 - t, 'easeOutBounce')

      case 'easeOutBounce':
        const n1 = 7.5625
        const d1 = 2.75
        if (t < 1 / d1) {
          return n1 * t * t
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375
        }

      case 'easeInOutBounce':
        return t < 0.5
          ? (1 - this.applyEasing(1 - 2 * t, 'easeOutBounce')) / 2
          : (1 + this.applyEasing(2 * t - 1, 'easeOutBounce')) / 2

      default:
        return t
    }
  }
}
```

Continuo com a Fase 3 completa e depois as Fases 4, 5 e 6 nos próximos arquivos. Quer que eu continue?