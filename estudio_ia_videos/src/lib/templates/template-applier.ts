/**
 * Template Applier
 * Logic to merge template elements into current project
 */

import { TimelineProject, TimelineElement, TimelineLayer } from '@lib/types/timeline-types';
import { Template } from './template-definitions';
import { logger } from '@lib/logger';

/**
 * Apply template to project
 * Merges template elements without overwriting existing elements
 */
export function applyTemplateToProject(
  template: Template,
  currentProject: TimelineProject | null,
  insertTime?: number
): TimelineProject {
  logger.info('Applying template', { templateId: template.id, insertTime });

  // If no project, create minimal one
  if (!currentProject) {
    return {
      id: crypto.randomUUID(),
      name: 'Novo Projeto',
      duration: Math.max(template.duration, 30),
      fps: 30,
      resolution: { width: 1920, height: 1080 },
      layers: [
        {
          id: 'template-layer',
          name: 'Template Layer',
          type: 'video', // Default type
          visible: true,
          locked: false,
          items: cloneTemplateElements(template.elements, 0)
        }
      ]
    };
  }

  // Determine insert time
  let targetTime = insertTime ?? 0;
  
  // Smart positioning based on template type
  if (template.type === 'intro' && insertTime === undefined) {
    targetTime = 0; // Always at start
  } else if (template.type === 'outro' && insertTime === undefined) {
    targetTime = Math.max(currentProject.duration - template.duration, 0); // At end
  }

  // Clone and adjust template elements
  const newElements = cloneTemplateElements(template.elements, targetTime);

  // Find or create target layer
  const templateLayerId = `template-${template.type}`;
  let targetLayer = currentProject.layers.find(l => l.id === templateLayerId);

  if (!targetLayer) {
    // Create new layer for template
    targetLayer = {
      id: templateLayerId,
      name: `${template.name} Layer`,
      type: 'video',
      visible: true,
      locked: false,
      items: []
    };
    currentProject.layers.push(targetLayer);
  }

  // Add elements to layer
  targetLayer.items.push(...newElements);

  // Update project duration if needed
  const maxEndTime = Math.max(
    ...currentProject.layers.flatMap(l => 
      l.items.map(e => e.start + e.duration)
    )
  );
  
  if (maxEndTime > currentProject.duration) {
    currentProject.duration = maxEndTime;
  }

  logger.info('Template applied successfully', {
    templateId: template.id,
    elementsAdded: newElements.length,
    newDuration: currentProject.duration
  });

  return currentProject;
}

/**
 * Clone template elements with new IDs and adjusted start times
 */
function cloneTemplateElements(
  elements: TimelineElement[],
  timeOffset: number
): TimelineElement[] {
  return elements.map(element => ({
    ...element,
    id: crypto.randomUUID(), // New unique ID
    start: element.start + timeOffset, // Adjust start time
    // Deep clone properties to avoid mutations
    properties: JSON.parse(JSON.stringify(element.properties || {}))
  }));
}
