/**
 * 📡 Progress API com Server-Sent Events (SSE)
 * 
 * Fornece atualizações em tempo real do progresso de renderização
 * Conexão: GET /api/render/progress/stream?jobId=xxx
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProgressUpdate {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  currentSlide?: number;
  totalSlides?: number;
  estimatedTimeRemaining?: number;
  outputUrl?: string;
  error?: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(request, 'render-progress-stream-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId é obrigatório' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar autenticação
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar se o job existe e pertence ao usuário
  const { data: job, error: jobError } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job || !job.project_id) {
    return new Response(JSON.stringify({ error: 'Job não encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar permissão (dono do job ou admin)
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', job.project_id)
    .single();

  if (project?.user_id !== user.id) {
    // Verificar se é admin - simplificado para evitar erro de schema
    // Na produção, usar tabela de roles adequada
    const isAdmin = false; // TODO: implementar verificação de admin
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Criar stream SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;
  let isConnected = true;


  const stream = new ReadableStream({
    async start(controller) {
      // Função para enviar update
      const sendUpdate = (data: ProgressUpdate) => {
        if (!isConnected) return;
        const message = `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch {
          isConnected = false;
        }
      };

      // Função para buscar status atual
      const fetchProgress = async () => {
        try {
          const { data: currentJob, error } = await supabase
            .from('render_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

          if (error || !currentJob) {
            sendUpdate({
              jobId,
              status: 'failed',
              progress: 0,
              error: 'Job não encontrado',
              timestamp: new Date().toISOString()
            });
            clearInterval(intervalId);
            controller.close();
            return;
          }

          const progress = currentJob.progress || 0;
          // render_settings pode conter metadata de progresso
          const renderSettings = currentJob.render_settings as Record<string, unknown> || {};
          
          const update: ProgressUpdate = {
            jobId,
            status: currentJob.status as ProgressUpdate['status'],
            progress,
            currentStep: renderSettings.currentStep as string,
            currentSlide: renderSettings.currentSlide as number,
            totalSlides: renderSettings.totalSlides as number,
            estimatedTimeRemaining: calculateETA(progress, currentJob.started_at),
            outputUrl: currentJob.output_url || undefined,
            error: currentJob.error_message || undefined,
            timestamp: new Date().toISOString()
          };

          sendUpdate(update);

          // Se completou ou falhou, fechar stream
          if (currentJob.status && ['completed', 'failed', 'cancelled'].includes(currentJob.status)) {
            clearInterval(intervalId);
            setTimeout(() => {
              controller.close();
            }, 1000);
          }
        } catch (err) {
          logger.error('[SSE Progress] Erro no polling', err instanceof Error ? err : new Error(String(err)), {
            component: 'API: render/progress/stream',
          });
        }
      };

      // Enviar estado inicial imediatamente
      await fetchProgress();

      // Polling a cada 2 segundos
      intervalId = setInterval(fetchProgress, 2000);
    },

    cancel() {
      isConnected = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx
    }
  });
}

/**
 * Calcula tempo estimado restante baseado no progresso
 */
function calculateETA(progress: number, startedAt: string | null): number | undefined {
  if (!startedAt || progress <= 0) return undefined;
  
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const totalEstimated = elapsed / (progress / 100);
  const remaining = totalEstimated - elapsed;
  
  return Math.max(0, Math.round(remaining / 1000)); // segundos
}
