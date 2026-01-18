import { createClient } from '@supabase/supabase-js';
import { getRequiredEnv } from '@lib/env';
import type { Database } from '@lib/supabase/database.types';

const BUCKET = process.env.SUBTITLES_BUCKET || 'subtitles';

const contentTypeForExtension = (ext: string) => {
  const normalized = ext.toLowerCase();
  if (normalized === 'vtt') return 'text/vtt';
  if (normalized === 'srt') return 'text/plain';
  if (normalized === 'ass') return 'text/plain';
  return 'application/octet-stream';
};

const supabaseClient = () =>
  createClient<Database>(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

export async function uploadSubtitleFile(params: {
  content: string;
  extension: 'srt' | 'vtt' | 'ass';
  projectId?: string | null;
  language: string;
  kind?: string;
}): Promise<{ url: string; path: string }> {
  const supabase = supabaseClient();
  const safeProject = (params.projectId || 'global').replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeLang = params.language.replace(/[^a-zA-Z0-9-_]/g, '_');
  const kind = params.kind ? params.kind.replace(/[^a-zA-Z0-9-_]/g, '_') : 'subtitle';
  const fileName = `${safeProject}/${kind}-${safeLang}-${Date.now()}.${params.extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, Buffer.from(params.content, 'utf-8'), {
      contentType: contentTypeForExtension(params.extension),
      upsert: false,
    });

  if (error) {
    throw new Error(`Falha ao enviar legenda: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return { url: data.publicUrl, path: fileName };
}
