import { NextResponse } from 'next/server'

import { parseUuidParam } from '@/lib/handlers/route-params'
import { logger } from '@/lib/services'
import { getSupabaseForRequest } from '@/lib/services/server'
import { applyRateLimit } from '@/lib/rate-limit';

type RenderJobRow = {
  id: string;
  status: string;
  project_id?: string | null;
  created_at?: string | null;
  progress?: number | null;
  user_id?: string | null;
  render_settings?: unknown;
  attempts?: number | null;
  duration_ms?: number | null;
};

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'v1-video-jobs-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = getSupabaseForRequest(req)
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Usuário não autenticado' }, { status: 401 })
    }

    const parsed = parseUuidParam(ctx.params)
    if (!parsed.success) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Parâmetro inválido', details: parsed.error.issues }, { status: 400 })
    }
    const { id } = parsed.data

    const { data, error } = await supabase
      .from('render_jobs')
      .select('id,status,project_id,created_at,progress,user_id,render_settings,attempts,duration_ms')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ code: 'NOT_FOUND', message: 'Job não encontrado' }, { status: 404 })

    const row = data as unknown as RenderJobRow
    if (row.user_id !== userData.user.id) return NextResponse.json({ code: 'FORBIDDEN', message: 'Sem permissão' }, { status: 403 })

    // Ocultar user_id no retorno público (monta resposta explicitamente)
    return NextResponse.json({
      job: {
        id: row.id,
        status: row.status,
        projectId: row.project_id ?? null,
        createdAt: row.created_at ?? null,
        progress: row.progress ?? null,
        attempts: row.attempts ?? null,
        durationMs: row.duration_ms ?? null,
        settings: row.render_settings,
      },
    })
  } catch (err) {
    logger.error('video-jobs-id', err as Error)
    return NextResponse.json({ code: 'UNEXPECTED', message: 'Erro inesperado', details: (err as Error).message }, { status: 500 })
  }
}
