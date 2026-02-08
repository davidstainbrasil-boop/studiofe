
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { NR_TEMPLATES, getTemplateById as getHardcodedTemplate, getTemplateByNR, type NRTemplate as HardcodedNRTemplate } from '@/lib/templates/nr-templates-real';

export interface NRTemplate {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  category?: string;
  nr_code?: string; // e.g. "NR-12"
  nrNumber?: string;
  content?: Record<string, unknown>;
  createdAt: string;
  slideCount?: number;
  durationSeconds?: number;
  durationFormatted?: string;
  tags?: string[];
  compliance?: {
    version: string;
    lastUpdate: string;
    source: string;
  };
}

/**
 * Transform hardcoded templates to API format
 */
function transformHardcodedTemplate(t: HardcodedNRTemplate): NRTemplate {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    nr_code: t.nr,
    nrNumber: t.nr,
    createdAt: t.compliance.lastUpdate,
    slideCount: t.slides.length,
    durationSeconds: t.duration * 60,
    durationFormatted: `${t.duration} min`,
    tags: t.tags,
    compliance: t.compliance,
    content: { slides: t.slides }
  };
}

export const NRTemplatesService = {
  getTemplates: async (): Promise<NRTemplate[]> => {
    try {
      const { data, error } = await supabase
        .from('nr_templates')
        .select('*')
        .order("createdAt", { ascending: false });

      if (error) {
        logger.warn('Database templates not available, using hardcoded:', error.message);
        // Fallback to hardcoded templates
        return NR_TEMPLATES.map(transformHardcodedTemplate);
      }

      // If database is empty, use hardcoded templates
      if (!data || data.length === 0) {
        return NR_TEMPLATES.map(transformHardcodedTemplate);
      }

      return (data as NRTemplate[]) || [];
    } catch (error) {
      logger.warn('NRTemplatesService.getTemplates using fallback:', { error: String(error) });
      // Fallback to hardcoded templates
      return NR_TEMPLATES.map(transformHardcodedTemplate);
    }
  },

  getTemplateById: async (id: string): Promise<NRTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('nr_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        // Try hardcoded template
        const hardcoded = getHardcodedTemplate(id);
        if (hardcoded) {
          return transformHardcodedTemplate(hardcoded);
        }
        return null;
      }

      return (data as NRTemplate) || null;
    } catch (error) {
      // Fallback to hardcoded
      const hardcoded = getHardcodedTemplate(id);
      if (hardcoded) {
        return transformHardcodedTemplate(hardcoded);
      }
      return null;
    }
  },

  getTemplateByNR: async (nr: string): Promise<NRTemplate | null> => {
    const hardcoded = getTemplateByNR(nr);
    if (hardcoded) {
      return transformHardcodedTemplate(hardcoded);
    }
    return null;
  }
};

export const listNRTemplates = async () => {
  return NRTemplatesService.getTemplates();
};

export const getNRTemplate = async (id: string) => {
  // Check if it's an NR code like "NR-06"
  if (id.toUpperCase().startsWith('NR-')) {
    return NRTemplatesService.getTemplateByNR(id);
  }
  return NRTemplatesService.getTemplateById(id);
};

export const searchNRTemplates = async (query: string): Promise<NRTemplate[]> => {
  const templates = await NRTemplatesService.getTemplates();
  const lowerQuery = query.toLowerCase();
  
  return templates.filter(t => 
    t.title.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.nr_code?.toLowerCase().includes(lowerQuery) ||
    t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const createNRTemplate = async (data: Partial<NRTemplate>) => {
  const { data: result, error } = await supabase
    .from('nr_templates')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

export const updateNRTemplate = async (id: string, data: Partial<NRTemplate>) => {
  const { data: result, error } = await supabase
    .from('nr_templates')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

export const deleteNRTemplate = async (id: string) => {
  const { error } = await supabase
    .from('nr_templates')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return { success: true };
};


