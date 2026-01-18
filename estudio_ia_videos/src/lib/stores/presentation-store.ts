/**
 * 🗃️ PPTX Presentation Store
 *
 * Zustand store for managing UniversalPresentationData state
 * with persistence and undo/redo capabilities.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  UniversalSlide,
  UniversalSlideElement,
  UniversalPresentationData,
} from '@/lib/pptx/parsers/element-parser';

interface PresentationState {
  // Current presentation data
  presentation: UniversalPresentationData | null;

  // Original (unedited) presentation for reset
  originalPresentation: UniversalPresentationData | null;

  // Edit state
  isDirty: boolean;
  selectedSlideIndex: number;

  // History for undo/redo
  history: UniversalSlide[][];
  historyIndex: number;

  // Actions
  loadPresentation: (data: UniversalPresentationData) => void;
  updateSlide: (index: number, updates: Partial<UniversalSlide>) => void;
  updateElement: (
    slideIndex: number,
    elementId: string,
    updates: Partial<UniversalSlideElement>,
  ) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  deleteSlide: (index: number) => void;
  selectSlide: (index: number) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  getSlides: () => UniversalSlide[];
  markSaved: () => void;
}

const MAX_HISTORY = 50;

export const usePresentationStore = create<PresentationState>()(
  persist(
    immer((set, get) => ({
      presentation: null,
      originalPresentation: null,
      isDirty: false,
      selectedSlideIndex: 0,
      history: [],
      historyIndex: -1,

      loadPresentation: (data) => {
        set((state) => {
          state.presentation = data;
          state.originalPresentation = JSON.parse(JSON.stringify(data));
          state.isDirty = false;
          state.selectedSlideIndex = 0;
          state.history = [data.slides.map((s) => ({ ...s }))];
          state.historyIndex = 0;
        });
      },

      updateSlide: (index, updates) => {
        set((state) => {
          if (!state.presentation) return;

          const slide = state.presentation.slides[index];
          Object.assign(slide, updates);
          state.isDirty = true;

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(state.presentation.slides.map((s) => ({ ...s })));
          if (newHistory.length > MAX_HISTORY) newHistory.shift();
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
        });
      },

      updateElement: (slideIndex, elementId, updates) => {
        set((state) => {
          if (!state.presentation) return;

          const slide = state.presentation.slides[slideIndex];
          const element = slide.elements.find((el) => el.id === elementId);
          if (element) {
            Object.assign(element, updates);
            state.isDirty = true;

            // Add to history
            const newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push(state.presentation.slides.map((s) => ({ ...s })));
            if (newHistory.length > MAX_HISTORY) newHistory.shift();
            state.history = newHistory;
            state.historyIndex = newHistory.length - 1;
          }
        });
      },

      moveSlide: (fromIndex, toIndex) => {
        set((state) => {
          if (!state.presentation) return;
          if (toIndex < 0 || toIndex >= state.presentation.slides.length) return;

          const slides = state.presentation.slides;
          const [moved] = slides.splice(fromIndex, 1);
          slides.splice(toIndex, 0, moved);

          // Update slide numbers
          slides.forEach((s, i) => {
            s.slideNumber = i + 1;
          });

          state.selectedSlideIndex = toIndex;
          state.isDirty = true;

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(slides.map((s) => ({ ...s })));
          if (newHistory.length > MAX_HISTORY) newHistory.shift();
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
        });
      },

      deleteSlide: (index) => {
        set((state) => {
          if (!state.presentation) return;
          if (state.presentation.slides.length <= 1) return;

          state.presentation.slides.splice(index, 1);
          state.presentation.slides.forEach((s, i) => {
            s.slideNumber = i + 1;
          });
          state.presentation.metadata.totalSlides = state.presentation.slides.length;

          state.selectedSlideIndex = Math.max(0, index - 1);
          state.isDirty = true;

          // Add to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(state.presentation.slides.map((s) => ({ ...s })));
          if (newHistory.length > MAX_HISTORY) newHistory.shift();
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
        });
      },

      selectSlide: (index) => {
        set((state) => {
          if (!state.presentation) return;
          if (index >= 0 && index < state.presentation.slides.length) {
            state.selectedSlideIndex = index;
          }
        });
      },

      reset: () => {
        set((state) => {
          if (!state.originalPresentation) return;
          state.presentation = JSON.parse(JSON.stringify(state.originalPresentation));
          state.isDirty = false;
          state.selectedSlideIndex = 0;
          state.history = [state.presentation!.slides.map((s) => ({ ...s }))];
          state.historyIndex = 0;
        });
      },

      undo: () => {
        set((state) => {
          if (!state.presentation || state.historyIndex <= 0) return;

          state.historyIndex -= 1;
          state.presentation.slides = state.history[state.historyIndex].map((s) => ({ ...s }));
          state.isDirty = true;
        });
      },

      redo: () => {
        set((state) => {
          if (!state.presentation || state.historyIndex >= state.history.length - 1) return;

          state.historyIndex += 1;
          state.presentation.slides = state.history[state.historyIndex].map((s) => ({ ...s }));
          state.isDirty = true;
        });
      },

      getSlides: () => {
        const state = get();
        return state.presentation?.slides || [];
      },

      markSaved: () => {
        set((state) => {
          state.isDirty = false;
        });
      },
    })),
    {
      name: 'pptx-presentation-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        presentation: state.presentation,
        originalPresentation: state.originalPresentation,
        selectedSlideIndex: state.selectedSlideIndex,
      }),
    },
  ),
);

export default usePresentationStore;
