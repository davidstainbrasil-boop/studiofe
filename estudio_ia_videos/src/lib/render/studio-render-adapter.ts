/**
 * Studio Render Adapter
 * Converte dados do timeline-store (Studio Unificado) para formato compatível com o sistema de render existente
 */

import { TimelineProject, TimelineElement } from '@lib/types/timeline-types';
import { logger } from '@lib/logger';

interface RenderSlide {
  id: string;
  orderIndex: number;
  imageUrl: string;
  audioUrl?: string;
  duration: number;
  transition: 'fade' | 'none';
  transitionDuration: number;
  title?: string;
  content?: string;
  avatarConfig?: Record<string, unknown>;
}

interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: string;
  codec: string;
  bitrate: string;
  audioCodec: string;
  audioBitrate: string;
}

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  bitrate: string;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube-1080p',
    name: 'YouTube / Web (1080p)',
    description: 'Padrão para vídeos em paisagem (16:9)',
    width: 1920,
    height: 1080,
    quality: 'high',
    bitrate: '5000k'
  },
  {
    id: 'tiktok-1080p',
    name: 'TikTok / Reels / Shorts',
    description: 'Formato vertical para mobile (9:16)',
    width: 1080,
    height: 1920,
    quality: 'high',
    bitrate: '5000k'
  },
  {
    id: 'instagram-1080p',
    name: 'Instagram Post (Square)',
    description: 'Quadrado 1:1 para feed',
    width: 1080,
    height: 1080,
    quality: 'medium',
    bitrate: '3500k'
  },
  {
    id: 'web-720p',
    name: 'Web Ligeiro (720p)',
    description: 'Arquivo menor para compartilhamento rápido',
    width: 1280,
    height: 720,
    quality: 'low',
    bitrate: '2500k'
  },
  {
    id: 'cinema-4k',
    name: '4K Cinematic',
    description: 'Ultra resolução para telas grandes',
    width: 3840,
    height: 2160,
    quality: 'ultra',
    bitrate: '15000k'
  }
];

export interface StudioExportPayload {
  projectId: string;
  slides: RenderSlide[];
  config: RenderConfig;
}

/**
 * Converte TimelineProject do Studio para formato de slides do render
 */
export function convertTimelineToRenderSlides(project: TimelineProject): RenderSlide[] {
  if (!project || !project.layers) {
    logger.warn('Empty project or no layers', { component: 'StudioRenderAdapter' });
    return [];
  }

  // Agrupa elementos por tempo (cria "frames" ou "slides")
  const allElements = project.layers.flatMap(layer => layer.items || []);
  
  // Ordena por tempo de início
  const sortedElements = allElements.sort((a, b) => a.start - b.start);

  // Estratégia simplificada: criar um slide por segundo do vídeo
  const durationSeconds = Math.ceil(project.duration);
  const slides: RenderSlide[] = [];

  for (let second = 0; second < durationSeconds; second++) {
    const slideId = `slide_${second}`;
    
    // Encontra elementos ativos neste segundo
    const activeElements = sortedElements.filter(el => {
      const elStart = el.start;
      const elEnd = el.start + el.duration;
      return second >= elStart && second < elEnd;
    });

    // Encontra áudio ativo (apenas music track)
    const activeAudio = activeElements.find(el => el.type === 'audio');

    slides.push({
      id: slideId,
      orderIndex: second,
      imageUrl: generateFrameImageUrl(activeElements, second, project),
      audioUrl: activeAudio?.source,
      duration: 1, // 1 segundo por slide
      transition: 'none', // Sem transição entre frames
      transitionDuration: 0,
      title: `Frame ${second}`,
      content: JSON.stringify({
        elements: activeElements.map(el => ({
          id: el.id,
          type: el.type,
          name: el.name,
          properties: el.properties
        }))
      })
    });
  }

  logger.info('Converted timeline to render slides', {
    component: 'StudioRenderAdapter',
    totalSlides: slides.length,
    duration: durationSeconds
  });

  return slides;
}

/**
 * Gera URL de imagem para um frame específico
 * Por enquanto, retorna placeholder - em produção, isso geraria snapshot do canvas
 */
function generateFrameImageUrl(
  elements: TimelineElement[],
  second: number,
  project: TimelineProject
): string {
  // TODO: Integrar com canvas para gerar snapshot real
  // Por enquanto, retorna placeholder ou primeira imagem encontrada
  const imageElement = elements.find(el => el.type === 'image');
  if (imageElement?.source) {
    return imageElement.source;
  }

  // Placeholder genérico
  return `/api/placeholder?width=${project.resolution.width}&height=${project.resolution.height}&text=Frame ${second}`;
}

/**
 * Cria configuração de render padrão
 */
export function createDefaultRenderConfig(project: TimelineProject): RenderConfig {
  return {
    width: project.resolution.width,
    height: project.resolution.height,
    fps: project.fps,
    quality: 'high',
    format: 'mp4',
    codec: 'h264',
    bitrate: '5000k',
    audioCodec: 'aac',
    audioBitrate: '128k'
  };
}

/**
 * Prepara payload completo para envio ao endpoint de render
 */
export function prepareStudioExportPayload(
  projectId: string,
  project: TimelineProject,
  customConfig?: Partial<RenderConfig>
): StudioExportPayload {
  const slides = convertTimelineToRenderSlides(project);
  const config = {
    ...createDefaultRenderConfig(project),
    ...customConfig
  };

  return {
    projectId,
    slides,
    config
  };
}
/**
 * Valida se o projeto pode ser exportado
 */
export function validateProjectForExport(project: TimelineProject | null): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!project) {
    errors.push('Nenhum projeto foi carregado.');
    return { valid: false, errors };
  }

  // Check 1: Empty Layers/Items
  const totalItems = project.layers.reduce((acc, layer) => acc + (layer.items?.length || 0), 0);
  if (totalItems === 0) {
    errors.push('O projeto está vazio. Adicione elementos à timeline.');
  }

  // Check 2: Duration check
  if (project.duration <= 0) {
    errors.push('A duração do projeto deve ser maior que zero.');
  }

  // Check 3: Missing Source in Media Elements
  let hasMissingSource = false;
  project.layers.forEach(layer => {
    layer.items.forEach(item => {
      if ((item.type === 'image' || item.type === 'audio' || item.type === 'video') && !item.source) {
        hasMissingSource = true;
      }
    });
  });

  if (hasMissingSource) {
    errors.push('Existem elementos de mídia sem arquivo ou URL válida.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
