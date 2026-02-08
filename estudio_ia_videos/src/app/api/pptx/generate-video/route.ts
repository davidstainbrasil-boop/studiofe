/**
 * 🎬 PPTX → Vídeo E2E Pipeline
 * POST /api/pptx/generate-video
 * 
 * Fluxo completo:
 * 1. Upload e parsing do PPTX
 * 2. Extração de slides (imagens, texto, notas)
 * 3. Geração TTS para cada slide (ElevenLabs)
 * 4. Renderização FFmpeg (slides + áudio sincronizado)
 * 5. Upload do vídeo final para Storage
 * 6. Retorna URL para download
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest, supabaseAdmin } from '@lib/supabase/server';
import { logger } from '@lib/logger';
import { PPTXProcessorReal, type PPTXExtractionResult } from '@lib/pptx/pptx-processor-real';
import { getTTSService } from '@lib/tts/tts-service-real';
import { storageSystem } from '@lib/storage-system-real';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { prisma } from '@lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

interface GenerateVideoRequest {
  projectId?: string;
  voiceId?: string;
  voiceProvider?: 'elevenlabs' | 'edge' | 'auto';
  quality?: 'low' | 'medium' | 'high';
  resolution?: '720p' | '1080p';
  useNotes?: boolean; // Use speaker notes for narration (default true)
  useContent?: boolean; // Use slide content for narration if no notes
  defaultSlideDuration?: number; // Fallback duration if no audio (default 5s)
}

interface SlideAudioResult {
  slideIndex: number;
  audioPath: string;
  audioUrl?: string;
  durationSeconds: number;
  text: string;
}

interface GenerateVideoProgress {
  stage: 'uploading' | 'parsing' | 'tts' | 'rendering' | 'uploading_video' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? 5 : duration;
  } catch {
    // Fallback estimate: MP3 at 128kbps = ~16KB/s
    const stats = await fs.stat(audioPath);
    return Math.max(1, stats.size / 16000);
  }
}

async function createSlideVideoSegment(
  imagePath: string,
  audioPath: string | null,
  outputPath: string,
  duration: number,
  resolution: { width: number; height: number }
): Promise<void> {
  const args: string[] = ['-y'];

  // Input: Image as video
  args.push('-loop', '1', '-i', imagePath);
  
  // Input: Audio (if exists)
  if (audioPath) {
    args.push('-i', audioPath);
  }

  // Video settings
  args.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-vf', `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`,
    '-r', '30'
  );

  // Audio settings
  if (audioPath) {
    args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  } else {
    // No audio - use fixed duration
    args.push('-t', String(duration));
  }

  args.push(outputPath);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

async function concatenateVideos(videoPaths: string[], outputPath: string): Promise<void> {
  // Create concat list file
  const listPath = outputPath.replace('.mp4', '_list.txt');
  const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
  await fs.writeFile(listPath, listContent);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      // Cleanup list file
      try { await fs.unlink(listPath); } catch { /* ignore */ }
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg concat failed with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let tempDir: string | null = null;

  try {
    const blocked = await applyRateLimit(req, 'pptx-video', 5);
    if (blocked) return blocked;

    // 1. Authentication
    const supabase = getSupabaseForRequest(req);
    let userId = req.headers.get('x-user-id');

    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      userId = user.id;
    }

    // 2. Parse request
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const optionsStr = formData.get('options') as string | null;
    
    const options: GenerateVideoRequest = optionsStr 
      ? JSON.parse(optionsStr) 
      : {};

    if (!file || !file.name.toLowerCase().endsWith('.pptx')) {
      return NextResponse.json(
        { error: 'Arquivo PPTX obrigatório' },
        { status: 400 }
      );
    }

    // File size limit (25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Limite: 25MB' },
        { status: 400 }
      );
    }

    logger.info('Starting PPTX→Video pipeline', {
      component: 'PPTXGenerateVideo',
      fileName: file.name,
      fileSize: file.size,
      userId
    });

    // 3. Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptx-video-'));
    
    // 4. Create project
    const projectId = options.projectId || randomUUID();
    const projectName = file.name.replace('.pptx', '');

    // Check if project exists, create if not
    let project = await prisma.projects.findUnique({ where: { id: projectId } });
    
    if (!project) {
      project = await prisma.projects.create({
        data: {
          id: projectId,
          userId,
          name: projectName,
          type: 'pptx',
          status: 'in_progress',
          metadata: {
            original_filename: file.name,
            created_via: 'generate-video-api'
          }
        }
      });
      logger.info('Created project', { projectId, component: 'PPTXGenerateVideo' });
    }

    // 5. Parse PPTX
    logger.info('Stage: Parsing PPTX', { component: 'PPTXGenerateVideo' });
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const extraction: PPTXExtractionResult = await PPTXProcessorReal.extract(buffer, projectId);
    
    if (!extraction.success || extraction.slides.length === 0) {
      throw new Error('Falha ao extrair slides do PPTX');
    }

    logger.info('PPTX parsed', {
      component: 'PPTXGenerateVideo',
      slideCount: extraction.slides.length,
      metadata: extraction.metadata
    });

    // 6. Generate TTS for each slide
    logger.info('Stage: Generating TTS', { component: 'PPTXGenerateVideo' });
    
    const ttsService = getTTSService();
    const slideAudios: SlideAudioResult[] = [];
    const resolution = options.resolution === '1080p' 
      ? { width: 1920, height: 1080 }
      : { width: 1280, height: 720 };

    for (let i = 0; i < extraction.slides.length; i++) {
      const slide = extraction.slides[i];
      
      // Determine text for narration
      let narrationText = '';
      if (options.useNotes !== false && slide.notes) {
        narrationText = slide.notes;
      } else if (options.useContent !== false && slide.content) {
        narrationText = slide.content;
      }

      if (narrationText.trim().length > 0) {
        try {
          const ttsResult = await ttsService.generate({
            text: narrationText,
            voice: options.voiceId || 'narrador-profissional',
            provider: options.voiceProvider || 'auto',
            language: 'pt-BR',
            cacheEnabled: true
          });

          if (ttsResult.success && ttsResult.audioUrl) {
            // Download audio to temp dir
            const audioPath = path.join(tempDir, `slide_${i}_audio.mp3`);
            
            const audioResponse = await fetch(ttsResult.audioUrl);
            if (audioResponse.ok) {
              const audioBuffer = await audioResponse.arrayBuffer();
              await fs.writeFile(audioPath, Buffer.from(audioBuffer));
              
              const duration = await getAudioDuration(audioPath);
              
              slideAudios.push({
                slideIndex: i,
                audioPath,
                audioUrl: ttsResult.audioUrl,
                durationSeconds: duration,
                text: narrationText.substring(0, 100)
              });

              logger.info(`TTS generated for slide ${i + 1}`, {
                component: 'PPTXGenerateVideo',
                duration,
                textLength: narrationText.length
              });
            }
          }
        } catch (ttsError) {
          logger.warn(`TTS failed for slide ${i + 1}, using silent video`, {
            component: 'PPTXGenerateVideo',
            error: ttsError instanceof Error ? ttsError.message : 'Unknown'
          });
        }
      }
    }

    // 7. Render each slide as video segment
    logger.info('Stage: Rendering video segments', { component: 'PPTXGenerateVideo' });
    
    const slideVideos: string[] = [];
    const defaultDuration = options.defaultSlideDuration || 5;

    for (let i = 0; i < extraction.slides.length; i++) {
      const slide = extraction.slides[i];
      const audioData = slideAudios.find(a => a.slideIndex === i);
      
      // Get slide image (first image from slide or create from title/content)
      let imagePath = path.join(tempDir, `slide_${i}.png`);
      
      if (slide.images && slide.images.length > 0) {
        // Download slide image
        await downloadImage(slide.images[0], imagePath);
      } else {
        // Create simple image from slide content
        await createPlaceholderImage(
          imagePath,
          slide.title || `Slide ${i + 1}`,
          slide.content || '',
          resolution
        );
      }

      // Create video segment
      const videoPath = path.join(tempDir, `slide_${i}.mp4`);
      const duration = audioData?.durationSeconds || slide.duration || defaultDuration;

      await createSlideVideoSegment(
        imagePath,
        audioData?.audioPath || null,
        videoPath,
        duration,
        resolution
      );

      slideVideos.push(videoPath);
      
      logger.info(`Rendered slide ${i + 1}/${extraction.slides.length}`, {
        component: 'PPTXGenerateVideo',
        hasAudio: !!audioData,
        duration
      });
    }

    // 8. Concatenate all segments
    logger.info('Stage: Concatenating videos', { component: 'PPTXGenerateVideo' });
    
    const finalVideoPath = path.join(tempDir, 'final_output.mp4');
    await concatenateVideos(slideVideos, finalVideoPath);

    // 9. Upload to storage
    logger.info('Stage: Uploading final video', { component: 'PPTXGenerateVideo' });
    
    const fileBuffer = await fs.readFile(finalVideoPath);
    const storagePath = `projects/${projectId}/videos/${Date.now()}_final.mp4`;
    
    const publicUrl = await storageSystem.upload({
      bucket: 'videos',
      path: storagePath,
      file: fileBuffer,
      contentType: 'video/mp4'
    });

    // 10. Update project status
    await prisma.projects.update({
      where: { id: projectId },
      data: {
        status: 'completed',
        metadata: {
          original_filename: file.name,
          video_url: publicUrl,
          slide_count: extraction.slides.length,
          total_duration: slideAudios.reduce((sum, a) => sum + a.durationSeconds, 0) + 
            (extraction.slides.length - slideAudios.length) * defaultDuration,
          generated_at: new Date().toISOString()
        }
      }
    });

    // 11. Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
    tempDir = null;

    const totalTime = (Date.now() - startTime) / 1000;

    logger.info('PPTX→Video pipeline completed', {
      component: 'PPTXGenerateVideo',
      projectId,
      slideCount: extraction.slides.length,
      totalTime,
      videoUrl: publicUrl
    });

    return NextResponse.json({
      success: true,
      projectId,
      videoUrl: publicUrl,
      slideCount: extraction.slides.length,
      totalDuration: slideAudios.reduce((sum, a) => sum + a.durationSeconds, 0) + 
        (extraction.slides.length - slideAudios.length) * defaultDuration,
      processingTime: totalTime,
      slides: extraction.slides.map((s, i) => ({
        index: i,
        title: s.title,
        hasAudio: slideAudios.some(a => a.slideIndex === i),
        duration: slideAudios.find(a => a.slideIndex === i)?.durationSeconds || defaultDuration
      }))
    });

  } catch (error) {
    logger.error('PPTX→Video pipeline failed', error instanceof Error ? error : new Error(String(error)), {
      component: 'PPTXGenerateVideo'
    });

    // Cleanup on error
    if (tempDir) {
      try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }

    return NextResponse.json(
      { 
        error: 'Falha ao gerar vídeo',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Helper to create placeholder image when no slide image available
async function createPlaceholderImage(
  outputPath: string,
  title: string,
  content: string,
  resolution: { width: number; height: number }
): Promise<void> {
  // Use FFmpeg to create a simple image with text
  const escapedTitle = title.replace(/'/g, "\\'").replace(/:/g, "\\:");
  const escapedContent = content.substring(0, 200).replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/\n/g, ' ');
  
  const filterComplex = [
    `color=c=#1a1a2e:s=${resolution.width}x${resolution.height}`,
    `drawtext=text='${escapedTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h/3`,
    escapedContent ? `drawtext=text='${escapedContent}':fontcolor=#cccccc:fontsize=24:x=(w-text_w)/2:y=h/2` : null
  ].filter(Boolean).join(',');

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', filterComplex,
      '-frames:v', '1',
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to create placeholder image: code ${code}`));
    });

    ffmpeg.on('error', reject);
  });
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for video generation
