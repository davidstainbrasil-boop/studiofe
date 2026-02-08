import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '../supabase/client';
import { logger } from '../logger';
import type {
  Scene,
  SceneVoiceConfig,
  SceneAvatarConfig,
  SceneMusicConfig,
  TTSState,
} from '@/types/scene';

// Types
interface Slide {
  id: string;
  number: number;
  order_index: number;
  title?: string;
  content?: string;
  notes?: string;
  duration?: number;
  elements: SlideElement[];
  background?: string;
  ttsText?: string;
  audioUrl?: string;
}

interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'video';
  content?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  created_at?: string;
  updated_at?: string;
}

interface DatabaseSlide {
  id: string;
  order_index: number;
  title?: string | null;
  content?: string | null;
  duration?: number | null;
  background_image?: string | null;
  background_color?: string | null;
  audio_config?: Record<string, unknown> | null;
  script?: string | null;
  voice_config?: Record<string, unknown> | null;
  avatar_config?: Record<string, unknown> | null;
  music_config?: Record<string, unknown> | null;
  notes?: string | null;
}

interface SlideWithTTS extends Slide {
  ttsState: TTSState;
  ttsUrl?: string;
  errorMessage?: string;
  visualSettings?: {
    backgroundImageUrl?: string;
    backgroundColor?: string;
  };
  // Per-scene configuration
  script?: string;
  voiceConfig?: SceneVoiceConfig;
  avatarConfig?: SceneAvatarConfig;
  musicConfig?: SceneMusicConfig;
}

interface EditorState {
  project: Project | null;
  slides: SlideWithTTS[];
  setSlides: (slides: Slide[]) => void;
  updateSlide: (slideId: string, slideData: Partial<Omit<SlideWithTTS, 'id'>>) => void;
  generateTTS: (slideId: string, text: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: (projectId: string) => Promise<void>;
  addSlide: (type?: 'video' | 'audio' | 'text' | 'pptx') => void;
  deleteSlide: (slideId: string) => void;
  reorderSlides: (startIndex: number, endIndex: number) => void;

  // Per-scene configuration methods
  updateSlideScript: (slideId: string, script: string) => void;
  updateSlideVoice: (slideId: string, voiceConfig: SceneVoiceConfig) => void;
  updateSlideAvatar: (slideId: string, avatarConfig: SceneAvatarConfig | undefined) => void;
  updateSlideMusic: (slideId: string, musicConfig: SceneMusicConfig | undefined) => void;
  generateSlideTTS: (slideId: string) => Promise<void>;
  generateAllTTS: () => Promise<void>;
}

export const useEditorStore = create<EditorState>()(
  devtools(
    immer((set, get) => ({
      project: null,
      slides: [],
      setSlides: (slides: Slide[]) =>
        set((state) => {
          state.slides = slides.map((slide: Slide) => ({
            ...slide,
            ttsState: 'idle',
          }));
        }),
      updateSlide: (slideId, slideData) =>
        set((state) => {
          const slide = state.slides.find((s: SlideWithTTS) => s.id === slideId);
          if (slide) {
            Object.assign(slide, slideData);
          }
        }),
      generateTTS: async (slideId, text) => {
        get().updateSlide(slideId, { ttsState: 'generating' });

        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, slideId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao gerar áudio');
          }

          const result = await response.json();
          get().updateSlide(slideId, {
            ttsState: 'success',
            audioUrl: result.audioUrl,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          get().updateSlide(slideId, {
            ttsState: 'error',
            errorMessage,
          });
        }
      },
      loadProject: async (projectId: string) => {
        const supabase = createClient();
        
        try {
          // Fetch project to verify existence and get metadata
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
            
          if (projectError) throw projectError;

          // Set project data
          set({ project: project as unknown as Project });

          // Fetch slides
          const { data: slides, error: slidesError } = await supabase
            .from('slides')
            .select('*')
            .eq("projectId", projectId)
            .order('order_index', { ascending: true });

          if (slidesError) throw slidesError;

          if (slides && slides.length > 0) {
            // Map database slides to store format
            const slidesData = slides as unknown as DatabaseSlide[];
            const mappedSlides: SlideWithTTS[] = slidesData.map((s) => ({
              id: s.id,
              number: s.order_index + 1,
              order_index: s.order_index,
              title: s.title || `Slide ${s.order_index + 1}`,
              content: s.content || '',
              duration: s.duration || 10,
              ttsState: 'idle' as TTSState,
              visualSettings: {
                backgroundImageUrl: s.background_image || undefined,
                backgroundColor: s.background_color || undefined,
              },
              elements: [],
              audioUrl: (s.audio_config as Record<string, unknown>)?.url as string | undefined,
              script: s.script || undefined,
              notes: s.notes || undefined,
              voiceConfig: s.voice_config ? (s.voice_config as unknown as SceneVoiceConfig) : undefined,
              avatarConfig: s.avatar_config ? (s.avatar_config as unknown as SceneAvatarConfig) : undefined,
              musicConfig: s.music_config ? (s.music_config as unknown as SceneMusicConfig) : undefined,
            }));
            
            set({ slides: mappedSlides });
          } else {
            // Initialize with a default slide if empty
            set({ slides: [] });
          }
        } catch (error) {
          logger.error('Error loading project', error instanceof Error ? error : new Error(String(error)), { component: 'EditorStore' });
          // You might want to set an error state here
        }
      },
      saveProject: async (projectId: string) => {
        const supabase = createClient();
        const state = get();
        
        try {
          if (state.slides.length === 0) return;

          // Prepare slides for upsert
          // Note: This assumes IDs are valid UUIDs. 
          // If you have temp IDs, you should handle them (e.g. remove ID to let DB generate, then reload)
          const slidesToSave = state.slides.map(s => ({
            id: s.id.includes('-') && s.id.length > 10 ? s.id : undefined,
            projectId: projectId,
            order_index: s.order_index,
            title: s.title,
            content: s.content,
            duration: s.duration,
            background_image: s.visualSettings?.backgroundImageUrl,
            background_color: s.visualSettings?.backgroundColor,
            audio_config: s.audioUrl ? { url: s.audioUrl } : undefined,
            script: s.script || null,
            notes: s.notes || null,
            voice_config: s.voiceConfig ? JSON.parse(JSON.stringify(s.voiceConfig)) : null,
            avatar_config: s.avatarConfig ? JSON.parse(JSON.stringify(s.avatarConfig)) : null,
            music_config: s.musicConfig ? JSON.parse(JSON.stringify(s.musicConfig)) : null,
            updatedAt: new Date().toISOString()
          }));

          const { error } = await supabase
            .from('slides')
            .upsert(slidesToSave);

          if (error) throw error;
          
          // Update project timestamp
          await supabase
            .from('projects')
            .update({ updatedAt: new Date().toISOString() })
            .eq('id', projectId);

        } catch (error) {
          logger.error('Error saving project', error instanceof Error ? error : new Error(String(error)), { component: 'EditorStore' });
          throw error;
        }
      },
      addSlide: (type: 'video' | 'audio' | 'text' | 'pptx' = 'pptx') => {
        const state = get();
        const newSlide: SlideWithTTS = {
          id: crypto.randomUUID(),
          number: state.slides.length + 1,
          order_index: state.slides.length,
          title: `New Slide ${state.slides.length + 1}`,
          content: 'New Slide Content',
          duration: 10,
          ttsState: 'idle',
          visualSettings: {},
          elements: []
        };
        set({ slides: [...state.slides, newSlide] });
      },
      deleteSlide: (slideId: string) => {
        set((state) => {
          state.slides = state.slides.filter(s => s.id !== slideId);
          // Re-index slides
          state.slides.forEach((slide, index) => {
            slide.order_index = index;
            slide.number = index + 1;
          });
        });
      },
      reorderSlides: (startIndex: number, endIndex: number) => {
        set((state) => {
          const result = Array.from(state.slides);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          
          // Re-index
          result.forEach((slide, index) => {
            slide.order_index = index;
            slide.number = index + 1;
          });
          
          state.slides = result;
        });
      },

      // ============================================
      // Per-scene configuration methods
      // ============================================

      updateSlideScript: (slideId: string, script: string) => {
        set((state) => {
          const slide = state.slides.find((s: SlideWithTTS) => s.id === slideId);
          if (slide) {
            slide.script = script;
            slide.ttsText = script; // keep backward compatibility
          }
        });
      },

      updateSlideVoice: (slideId: string, voiceConfig: SceneVoiceConfig) => {
        set((state) => {
          const slide = state.slides.find((s: SlideWithTTS) => s.id === slideId);
          if (slide) {
            slide.voiceConfig = voiceConfig;
          }
        });
      },

      updateSlideAvatar: (slideId: string, avatarConfig: SceneAvatarConfig | undefined) => {
        set((state) => {
          const slide = state.slides.find((s: SlideWithTTS) => s.id === slideId);
          if (slide) {
            slide.avatarConfig = avatarConfig;
          }
        });
      },

      updateSlideMusic: (slideId: string, musicConfig: SceneMusicConfig | undefined) => {
        set((state) => {
          const slide = state.slides.find((s: SlideWithTTS) => s.id === slideId);
          if (slide) {
            slide.musicConfig = musicConfig;
          }
        });
      },

      generateSlideTTS: async (slideId: string) => {
        const state = get();
        const slide = state.slides.find((s: SlideWithTTS) => s.id === slideId);
        if (!slide?.script?.trim()) {
          logger.warn('No script for TTS generation', { slideId });
          return;
        }

        get().updateSlide(slideId, { ttsState: 'generating' });

        try {
          const voiceId = slide.voiceConfig?.voiceId || 'pt-BR-FranciscaNeural';
          const provider = slide.voiceConfig?.provider || 'edge-tts';

          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: slide.script,
              voiceId,
              provider,
              speed: slide.voiceConfig?.speed || 1.0,
              slideId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `TTS failed (${response.status})`);
          }

          const result = await response.json();
          get().updateSlide(slideId, {
            ttsState: 'ready',
            audioUrl: result.audioUrl || result.url,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          get().updateSlide(slideId, {
            ttsState: 'error',
            errorMessage,
          });
          logger.error('TTS generation failed', error instanceof Error ? error : new Error(errorMessage), { slideId });
        }
      },

      generateAllTTS: async () => {
        const state = get();
        const slidesWithScript = state.slides.filter(
          (s: SlideWithTTS) => s.script?.trim() && s.ttsState !== 'ready'
        );

        for (const slide of slidesWithScript) {
          await get().generateSlideTTS(slide.id);
        }
      },
    }))
  )
);
