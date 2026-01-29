/**
 * Template Applier
 * Logic to merge template elements into current project
 */

import { TimelineProject, TimelineElement, TimelineLayer } from '@lib/types/timeline-types';
import { Template } from './template-definitions';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import crypto from 'crypto';

interface TemplateData {
  id: string;
  title: string;
  slides: any[]; // Defined in JSON
}

export class TemplateApplier {
  
  /**
   * Apply template to project by ID
   * Merges template elements without overwriting existing elements
   */
  async applyTemplate(projectId: string, templateId: string): Promise<void> {
    logger.info('Applying template', { projectId, templateId });

    // 1. Fetch Template from DB (Real)
    let templateData: TemplateData | null = null;

    // Try NR Templates
    const nrTemplate = await prisma.nr_templates.findUnique({ where: { id: templateId } });
    if (nrTemplate) {
        const config = nrTemplate.templateConfig as any || {};
        templateData = {
            id: nrTemplate.id,
            title: nrTemplate.title,
            slides: config.slides || []
        };
    } else {
        // Try Generic Templates
        const genTemplate = await prisma.templates.findUnique({ where: { id: templateId } });
        if (genTemplate) {
             const metadata = genTemplate.metadata as any || {};
             const settings = genTemplate.settings as any || {};
             templateData = {
                 id: genTemplate.id,
                 title: genTemplate.name,
                 slides: metadata.slides || settings.slides || []
             };
        }
    }

    if (!templateData) {
        throw new Error(`Template not found: ${templateId}`);
    }

    // 2. Fetch Project
    const project = await prisma.projects.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    // 3. Apply logic (Create Slides in DB)
    if (templateData.slides && Array.isArray(templateData.slides) && templateData.slides.length > 0) {
        logger.info(`Creating ${templateData.slides.length} slides from template`, { projectId });
        
        // Get current max order index
        const lastSlide = await prisma.slides.findFirst({
            where: { projectId },
            orderBy: { orderIndex: 'desc' }
        });
        let startIndex = (lastSlide?.orderIndex ?? -1) + 1;

        for (const s of templateData.slides) {
             await prisma.slides.create({
                 data: {
                     projectId,
                     orderIndex: startIndex++,
                     title: s.title || `Slide ${startIndex}`,
                     content: s.content || '',
                     duration: s.duration || 5,
                     backgroundColor: s.backgroundColor,
                     backgroundImage: s.backgroundImage,
                     avatarConfig: s.avatarConfig || {},
                     audioConfig: s.audioConfig || {}
                 }
             });
        }
    } else {
        // Timeline based or empty?
        logger.warn('Template has no slides configuration', { templateId });
        // Could implement timeline layer copying here if we had timeline storage structure fully defined
    }
  }
}

