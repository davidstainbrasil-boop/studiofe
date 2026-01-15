/**
 * FFmpeg Video Renderer - Renderização local de vídeos
 * Usa FFmpeg para criar vídeos profissionais a partir de slides
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PIPELINE_TIMEOUTS } from '../config/timeout-config';

const execAsync = promisify(exec);

// Diretórios
const TEMP_DIR = join(process.cwd(), 'tmp', 'render');
const OUTPUT_DIR = join(process.cwd(), 'public', 'videos');

// Configurações de renderização
export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  videoBitrate: string;
  audioBitrate: string;
  format: 'mp4' | 'webm';
}

export const DEFAULT_CONFIG: RenderConfig = {
  width: 1920,
  height: 1080,
  fps: 30,
  videoBitrate: '5000k',
  audioBitrate: '192k',
  format: 'mp4',
};

export interface SlideData {
  id: string;
  title: string;
  content: string;
  duration: number;
  audioUrl?: string;
  backgroundColor?: string;
  backgroundImage?: string;
}

export interface RenderResult {
  success: boolean;
  videoUrl?: string;
  videoPath?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

// Garantir diretórios existem
async function ensureDirectories() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Gera uma imagem de slide usando ImageMagick/convert
 */
async function generateSlideImage(
  slide: SlideData,
  outputPath: string,
  config: RenderConfig
): Promise<boolean> {
  try {
    const { width, height } = config;
    const bgColor = slide.backgroundColor || '#1a1a2e';
    
    // Texto formatado
    const title = slide.title.replace(/'/g, "'\\''").substring(0, 100);
    const content = slide.content.replace(/'/g, "'\\''").substring(0, 500);

    // Usar convert do ImageMagick para criar imagem
    const command = `convert -size ${width}x${height} xc:'${bgColor}' \
      -gravity North -pointsize 72 -fill white -font DejaVu-Sans-Bold \
      -annotate +0+100 '${title}' \
      -gravity Center -pointsize 36 -fill '#cccccc' -font DejaVu-Sans \
      -annotate +0+50 '${content.substring(0, 200)}' \
      '${outputPath}'`;

    await execAsync(command, { timeout: 30000 });
    return existsSync(outputPath);
  } catch (error) {
    console.warn(`[Render] Erro ao gerar imagem do slide, usando fallback:`, error);
    // Fallback: criar imagem simples com FFmpeg
    const { width, height } = config;
    const bgColor = slide.backgroundColor || '#1a1a2e';
    const hexColor = bgColor.replace('#', '');
    
    const command = `ffmpeg -y -f lavfi -i color=c=${hexColor}:s=${width}x${height}:d=1 \
      -vf "drawtext=text='${slide.title.replace(/'/g, "\\'")}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=h/4" \
      -frames:v 1 '${outputPath}'`;
    
    try {
      await execAsync(command, { timeout: 30000 });
      return existsSync(outputPath);
    } catch {
      return false;
    }
  }
}

/**
 * Renderiza um vídeo a partir de slides
 */
export async function renderVideo(
  slides: SlideData[],
  projectId: string,
  config: Partial<RenderConfig> = {}
): Promise<RenderResult> {
  await ensureDirectories();
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const renderJobId = randomUUID();
  const jobDir = join(TEMP_DIR, renderJobId);
  
  try {
    await mkdir(jobDir, { recursive: true });
    console.log(`[Render] Iniciando renderização: ${renderJobId}`);

    // 1. Gerar imagens dos slides
    const slideImages: string[] = [];
    const slideDurations: number[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const imagePath = join(jobDir, `slide_${i.toString().padStart(3, '0')}.png`);
      
      const success = await generateSlideImage(slide, imagePath, finalConfig);
      if (success) {
        slideImages.push(imagePath);
        slideDurations.push(slide.duration || 5);
      }
    }

    if (slideImages.length === 0) {
      throw new Error('Nenhum slide foi gerado');
    }

    // 2. Criar arquivo de input para concat
    const concatFilePath = join(jobDir, 'concat.txt');
    let concatContent = '';
    
    for (let i = 0; i < slideImages.length; i++) {
      const duration = slideDurations[i];
      concatContent += `file '${slideImages[i]}'\n`;
      concatContent += `duration ${duration}\n`;
    }
    // Adicionar último frame novamente para evitar corte
    concatContent += `file '${slideImages[slideImages.length - 1]}'\n`;
    
    await writeFile(concatFilePath, concatContent);

    // 3. Combinar áudios se existirem
    const audioUrls = slides.filter(s => s.audioUrl).map(s => s.audioUrl);
    let audioPath: string | null = null;
    
    if (audioUrls.length > 0) {
      // Criar lista de áudios para concat
      const audioListPath = join(jobDir, 'audio_list.txt');
      const audioPaths: string[] = [];
      
      for (let i = 0; i < audioUrls.length; i++) {
        const audioUrl = audioUrls[i]!;
        if (audioUrl.startsWith('/')) {
          const localAudioPath = join(process.cwd(), 'public', audioUrl);
          if (existsSync(localAudioPath)) {
            audioPaths.push(localAudioPath);
          }
        }
      }

      if (audioPaths.length > 0) {
        const audioListContent = audioPaths.map(p => `file '${p}'`).join('\n');
        await writeFile(audioListPath, audioListContent);
        
        audioPath = join(jobDir, 'combined_audio.mp3');
        const audioConcatCmd = `ffmpeg -y -f concat -safe 0 -i '${audioListPath}' -c copy '${audioPath}'`;
        
        try {
          await execAsync(audioConcatCmd, { timeout: 120000 });
        } catch {
          audioPath = null;
        }
      }
    }

    // 4. Renderizar vídeo final
    const outputFileName = `${projectId}_${Date.now()}.${finalConfig.format}`;
    const outputPath = join(OUTPUT_DIR, outputFileName);
    const outputUrl = `/videos/${outputFileName}`;

    let ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i '${concatFilePath}' `;
    
    if (audioPath && existsSync(audioPath)) {
      ffmpegCmd += `-i '${audioPath}' `;
    }
    
    ffmpegCmd += `-vf "scale=${finalConfig.width}:${finalConfig.height}:force_original_aspect_ratio=decrease,pad=${finalConfig.width}:${finalConfig.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p" `;
    ffmpegCmd += `-c:v libx264 -preset medium -b:v ${finalConfig.videoBitrate} `;
    
    if (audioPath && existsSync(audioPath)) {
      ffmpegCmd += `-c:a aac -b:a ${finalConfig.audioBitrate} `;
    } else {
      ffmpegCmd += `-an `;
    }
    
    ffmpegCmd += `-movflags +faststart '${outputPath}'`;

    console.log(`[Render] Executando FFmpeg...`);
    await execAsync(ffmpegCmd, { timeout: PIPELINE_TIMEOUTS.slideComposition }); // Centralized timeout

    // 5. Verificar resultado
    if (!existsSync(outputPath)) {
      throw new Error('Arquivo de vídeo não foi gerado');
    }

    const { stdout: sizeStdout } = await execAsync(`stat -c%s '${outputPath}'`);
    const fileSize = parseInt(sizeStdout.trim());

    const { stdout: durationStdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '${outputPath}'`
    );
    const duration = parseFloat(durationStdout.trim());

    // 6. Limpar arquivos temporários
    try {
      const { stdout: files } = await execAsync(`ls -1 '${jobDir}'`);
      for (const file of files.split('\n').filter(f => f)) {
        await unlink(join(jobDir, file));
      }
      await execAsync(`rmdir '${jobDir}'`);
    } catch {
      // Ignore cleanup errors
    }

    console.log(`[Render] Vídeo gerado com sucesso: ${outputUrl}`);

    return {
      success: true,
      videoUrl: outputUrl,
      videoPath: outputPath,
      duration,
      fileSize,
    };

  } catch (error) {
    console.error('[Render] Erro:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Renderiza um vídeo simples com texto
 */
export async function renderSimpleVideo(
  text: string,
  audioUrl: string | null,
  projectId: string,
  duration: number = 10
): Promise<RenderResult> {
  const slides: SlideData[] = [{
    id: 'slide-1',
    title: text.substring(0, 50),
    content: text,
    duration,
    audioUrl: audioUrl || undefined,
    backgroundColor: '#1a1a2e',
  }];

  return renderVideo(slides, projectId);
}

/**
 * Verifica se FFmpeg está disponível
 */
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtém informações de um vídeo
 */
export async function getVideoInfo(videoPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  codec: string;
  fileSize: number;
} | null> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams '${videoPath}'`
    );
    const info = JSON.parse(stdout);
    
    const videoStream = info.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
    
    return {
      duration: parseFloat(info.format?.duration || '0'),
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      codec: videoStream?.codec_name || 'unknown',
      fileSize: parseInt(info.format?.size || '0'),
    };
  } catch {
    return null;
  }
}

// Exportar como serviço
export const FFmpegRenderer = {
  renderVideo,
  renderSimpleVideo,
  checkFFmpeg,
  getVideoInfo,
  DEFAULT_CONFIG,
};

export default FFmpegRenderer;

