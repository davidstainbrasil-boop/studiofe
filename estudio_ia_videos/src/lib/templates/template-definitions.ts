/**
 * Template Definitions
 * Hardcoded professional templates for Studio Unified
 */

import { TimelineElement } from '@lib/types/timeline-types';

export interface Template {
  id: string;
  name: string;
  type: 'intro' | 'outro' | 'lower-third';
  description: string;
  duration: number; // seconds
  elements: TimelineElement[];
  preview: string; // URL or data URI
}

/**
 * Intro Simples
 * Texto "Bem-vindo" centralizado com fade in/out
 */
export const INTRO_SIMPLE: Template = {
  id: 'intro-simple',
  name: 'Intro Simples',
  type: 'intro',
  description: 'Texto de boas-vindas com fade suave',
  duration: 3,
  elements: [
    {
      id: 'intro-text-1',
      type: 'text',
      name: 'Bem-vindo',
      start: 0,
      duration: 3,
      layerId: 'template-layer-intro',
      source: 'text',
      layer: 1,
      properties: {
        text: 'Bem-vindo',
        fontSize: 72,
        fontWeight: 700,
        color: '#ffffff',
        left: 960,
        top: 540,
        width: 400,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        opacity: 1
      }
    }
  ],
  preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMiIgZmlsbD0iIzFhMWExYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW50cm88L3RleHQ+PC9zdmc+'
};

/**
 * Outro Simples
 * Texto "Obrigado" + CTA "Inscreva-se"
 */
export const OUTRO_SIMPLE: Template = {
  id: 'outro-simple',
  name: 'Outro Simples',
  type: 'outro',
  description: 'Agradecimento e call-to-action',
  duration: 5,
  elements: [
    {
      id: 'outro-text-1',
      type: 'text',
      name: 'Obrigado',
      start: 0,
      duration: 5,
      layerId: 'template-layer-outro',
      source: 'text',
      layer: 1,
      properties: {
        text: 'Obrigado por Assistir!',
        fontSize: 64,
        fontWeight: 700,
        color: '#ffffff',
        left: 960,
        top: 400,
        width: 600,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        opacity: 1
      }
    },
    {
      id: 'outro-text-2',
      type: 'text',
      name: 'CTA',
      start: 0,
      duration: 5,
      layerId: 'template-layer-outro',
      source: 'text',
      layer: 2,
      properties: {
        text: '👍 Inscreva-se no Canal',
        fontSize: 36,
        fontWeight: 500,
        color: '#fbbf24',
        left: 960,
        top: 600,
        width: 500,
        height: 60,
        scaleX: 1,
        scaleY: 1,
        opacity: 1
      }
    }
  ],
  preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMiIgZmlsbD0iIzFhMWExYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+T3V0cm88L3RleHQ+PC9zdmc+'
};

/**
 * Lower Third
 * Barra inferior com nome + título
 */
export const LOWER_THIRD: Template = {
  id: 'lower-third',
  name: 'Lower Third',
  type: 'lower-third',
  description: 'Barra inferior com nome e título',
  duration: 8,
  elements: [
    {
      id: 'lower-bg',
      type: 'shape',
      name: 'Barra de Fundo',
      start: 0,
      duration: 8,
      layerId: 'template-layer-lower',
      source: 'shape',
      layer: 0,
      properties: {
        shape: 'rectangle',
        fill: '#3b82f6',
        left: 100,
        top: 900,
        width: 600,
        height: 120,
        scaleX: 1,
        scaleY: 1,
        opacity: 0.9
      }
    },
    {
      id: 'lower-name',
      type: 'text',
      name: 'Nome',
      start: 0,
      duration: 8,
      layerId: 'template-layer-lower',
      source: 'text',
      layer: 1,
      properties: {
        text: 'João Silva',
        fontSize: 32,
        fontWeight: 700,
        color: '#ffffff',
        left: 130,
        top: 920,
        width: 400,
        height: 40,
        scaleX: 1,
        scaleY: 1,
        opacity: 1
      }
    },
    {
      id: 'lower-title',
      type: 'text',
      name: 'Título',
      start: 0,
      duration: 8,
      layerId: 'template-layer-lower',
      source: 'text',
      layer: 2,
      properties: {
        text: 'Especialista em Tecnologia',
        fontSize: 20,
        fontWeight: 400,
        color: '#e5e7eb',
        left: 130,
        top: 970,
        width: 400,
        height: 30,
        scaleX: 1,
        scaleY: 1,
        opacity: 1
      }
    }
  ],
  preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMiIgZmlsbD0iIzFhMWExYSIvPjxyZWN0IHg9IjEwIiB5PSI4MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIyNSIgZmlsbD0iIzNiODJmNiIgb3BhY2l0eT0iMC45Ii8+PHRleHQgeD0iMTUiIHk9Ijk1IiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSI+TG93ZXIgVGhpcmQ8L3RleHQ+PC9zdmc+'
};

/**
 * All available templates
 */
export const ALL_TEMPLATES: Template[] = [
  INTRO_SIMPLE,
  OUTRO_SIMPLE,
  LOWER_THIRD
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): Template | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: Template['type']): Template[] {
  return ALL_TEMPLATES.filter(t => t.type === type);
}
