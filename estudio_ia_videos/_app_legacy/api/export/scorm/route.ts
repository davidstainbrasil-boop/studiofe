/**
 * 📦 SCORM Export API Route
 * 
 * Gera pacotes SCORM para integração com LMS
 * Suporta SCORM 1.2 e SCORM 2004
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateScormPackage, addVideoToScormPackage, type ScormExportOptions } from '@/lib/export/scorm-export';
import { Logger } from '@lib/logger';
import { createClient } from '@lib/supabase/server';
import { globalRateLimiter } from '@lib/rate-limit';
import { headers } from 'next/headers';

const logger = new Logger('api:export:scorm');

// =============================================================================
// Validation Schema
// =============================================================================

const scormExportSchema = z.object({
  courseTitle: z.string().min(1, 'Título do curso é obrigatório'),
  courseId: z.string().min(1, 'ID do curso é obrigatório'),
  organizationName: z.string().min(1, 'Nome da organização é obrigatório'),
  scormVersion: z.enum(['1.2', '2004']).default('2004'),
  
  // Optional
  courseDescription: z.string().optional(),
  duration: z.number().positive().optional(),
  masteryScore: z.number().min(0).max(100).optional(),
  maxTimeAllowed: z.string().optional(),
  
  // Video source
  videoUrl: z.string().url().optional(),
  videoJobId: z.string().optional(),
  
  // Quiz questions
  quizQuestions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    type: z.enum(['multiple-choice', 'true-false']),
    options: z.array(z.string()).optional(),
    correctAnswer: z.union([z.number(), z.boolean()]),
  })).optional(),
});

type ScormExportRequest = z.infer<typeof scormExportSchema>;

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Get client IP for rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // 2. Rate limiting
    const rateLimitResult = globalRateLimiter.check(ip);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for SCORM export', { ip });
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }
    
    // 3. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('Unauthorized SCORM export attempt', { ip });
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    
    // 4. Parse and validate request
    const body = await request.json();
    const parseResult = scormExportSchema.safeParse(body);
    
    if (!parseResult.success) {
      logger.warn('Invalid SCORM export request', { errors: parseResult.error.errors });
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.errors },
        { status: 400 }
      );
    }
    
    const data = parseResult.data;
    
    logger.info('Iniciando exportação SCORM', {
      userId: user.id,
      courseId: data.courseId,
      version: data.scormVersion,
    });
    
    // 5. Build SCORM options - map schema fields to interface
    const scormOptions: ScormExportOptions = {
      courseTitle: data.courseTitle,
      courseId: data.courseId,
      organizationName: data.organizationName,
      version: data.scormVersion as '1.2' | '2004',
      courseDescription: data.courseDescription,
      videoUrl: data.videoUrl || '',
      videoDurationSeconds: data.duration || 0,
      passingScore: data.masteryScore ?? 80,
      // Map quiz questions, handling correctAnswer type
      quizQuestions: data.quizQuestions?.map(q => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options || [],
        // Convert boolean to number for SCORM compatibility
        correctAnswer: typeof q.correctAnswer === 'boolean' 
          ? (q.correctAnswer ? 1 : 0) 
          : q.correctAnswer,
      })),
    };
    
    // 6. Generate base SCORM package
    let scormBlob = await generateScormPackage(scormOptions);
    
    // 7. Add video if provided
    if (data.videoUrl) {
      try {
        const videoResponse = await fetch(data.videoUrl);
        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob();
          scormBlob = await addVideoToScormPackage(scormBlob, videoBlob);
          logger.info('Vídeo adicionado ao pacote SCORM', { size: videoBlob.size });
        }
      } catch (videoError) {
        logger.warn('Não foi possível adicionar vídeo ao SCORM', { error: videoError });
        // Continue without video
      }
    } else if (data.videoJobId) {
      // Fetch video from render job
      try {
        const { data: job, error: jobError } = await supabase
          .from('render_jobs')
          .select('output_url')
          .eq('id', data.videoJobId)
          .eq('user_id', user.id)
          .single();
        
        if (!jobError && job?.output_url) {
          const videoResponse = await fetch(job.output_url);
          if (videoResponse.ok) {
            const videoBlob = await videoResponse.blob();
            scormBlob = await addVideoToScormPackage(scormBlob, videoBlob);
            logger.info('Vídeo do job adicionado ao SCORM', { jobId: data.videoJobId });
          }
        }
      } catch (jobFetchError) {
        logger.warn('Não foi possível buscar vídeo do job', { error: jobFetchError });
      }
    }
    
    // 8. Log export activity (try-catch to handle missing table gracefully)
    try {
      // Using type assertion for tables not in schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('activity_log').insert({
        user_id: user.id,
        action: 'scorm_export',
        metadata: {
          course_id: data.courseId,
          course_title: data.courseTitle,
          scorm_version: data.scormVersion,
          has_video: !!(data.videoUrl || data.videoJobId),
          has_quiz: !!(data.quizQuestions && data.quizQuestions.length > 0),
        },
      });
    } catch {
      // Table might not exist yet - log warning but continue
      logger.warn('Tabela activity_log não disponível');
    }
    
    // 9. Return the SCORM package
    const filename = `${data.courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}_SCORM_${data.scormVersion}.zip`;
    
    logger.info('Exportação SCORM concluída', {
      userId: user.id,
      courseId: data.courseId,
      size: scormBlob.size,
      duration: Date.now() - startTime,
    });
    
    // Convert blob to buffer for response
    const arrayBuffer = await scormBlob.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': scormBlob.size.toString(),
      },
    });
    
  } catch (error) {
    logger.error('Erro na exportação SCORM', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno ao gerar pacote SCORM' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Info endpoint
// =============================================================================

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'SCORM Export',
    version: '1.0.0',
    supportedVersions: ['1.2', '2004'],
    description: 'Gera pacotes SCORM para integração com LMS',
    features: [
      'SCORM 1.2 (compatível com sistemas legados)',
      'SCORM 2004 4th Edition',
      'Player HTML5 integrado',
      'Quiz pós-vídeo',
      'Tracking de progresso',
      'Certificação de conclusão',
    ],
  });
}
