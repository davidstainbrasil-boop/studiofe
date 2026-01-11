
import { supabase } from '@/lib/supabase/client';

export interface NRTemplate {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  category?: string;
  nr_code?: string; // e.g. "NR-12"
  content?: any;
  createdAt: string;
}

export const NRTemplatesService = {
  getTemplates: async (): Promise<NRTemplate[]> => {
    try {
      const { data, error } = await supabase
        .from('nr_templates')
        .select('*')
        .order("createdAt", { ascending: false });

      if (error) {
        console.error('Error fetching NR templates:', error);
        return [];
      }

      return (data as NRTemplate[]) || [];
    } catch (error) {
      console.error('NRTemplatesService.getTemplates error:', error);
      return [];
    }
  },

  getTemplateById: async (id: string): Promise<NRTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('nr_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching NR template ${id}:`, error);
        return null;
      }

      return (data as NRTemplate) || null;
    } catch (error) {
      console.error('NRTemplatesService.getTemplateById error:', error);
      return null;
    }
  }
};

export const listNRTemplates = async () => {
    return NRTemplatesService.getTemplates();
};
export const getNRTemplate = async (id: string) => NRTemplatesService.getTemplateById(id);
export const searchNRTemplates = async (query: string) => [];
export const createNRTemplate = async (data: any) => ({});
export const updateNRTemplate = async (id: string, data: any) => ({});
export const deleteNRTemplate = async (id: string) => ({});


