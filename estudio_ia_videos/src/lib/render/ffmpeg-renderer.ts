/**
 * 🎬 FFmpeg Real Video Renderer
 * Renderização real de vídeos usando FFmpeg
 */

import { createLogger } from '@/lib/monitoring/logger';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const logger = createLogger('FFmpegRenderer');

export interface RenderSlide {
  id: string;
  content: string;
  audioUrl?: string;
  duration: number;
  backgroundImage?: string;
}

export interface RenderOptions {
  resolution: '720p' | '1080p' | '4k';
  fps: number;
  outputFormat: 'mp4' | 'webm';
  quality: 'draft' | 'standard' | 'high';
  includeSubtitles: boolean;
}

export interface RenderProgress {
  phase: 'preparing' | 'processing' | 'finalizing' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  currentSlide?: number;
  totalSlides?: number;
  eta?: number; // segundos estimados
  message?: string;
}

export class FFmpegRenderer {
  private tempDir: string;
  private ffmpegPath: string;
  
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'ffmpeg-render');
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  }

  /**
   * Verifica se FFmpeg está disponível
   */
  async checkFFmpeg(): Promise<boolean> {
    try {
      const process = spawn(this.ffmpegPath, ['-version']);
      
      return new Promise((resolve) => {
        process.on('exit', (code) => {
          resolve(code === 0);
        });
        
        process.on('error', () => {
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Renderiza vídeo completo a partir dos slides
   */
  async renderVideo(
    slides: RenderSlide[], 
    options: RenderOptions,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<{ success: boolean; videoPath?: string; error?: string }> {
    
    const jobId = `render-${Date.now()}`;
    const jobDir = path.join(this.tempDir, jobId);
    
    try {
      // Verificar FFmpeg
      const ffmpegAvailable = await this.checkFFmpeg();
      if (!ffmpegAvailable) {
        throw new Error('FFmpeg não está disponível no sistema');
      }

      onProgress?.({
        phase: 'preparing',
        progress: 5,
        message: 'Preparando ambiente de renderização...'
      });

      // Criar diretório temporário
      await fs.mkdir(jobDir, { recursive: true });
      
      // Preparar arquivos de slides
      onProgress?.({
        phase: 'preparing',
        progress: 15,
        message: 'Preparando slides...'
      });
      
      const slideFiles = await this.prepareSlideImages(slides, jobDir);
      
      // Baixar/preparar áudios
      onProgress?.({
        phase: 'preparing',
        progress: 30,
        message: 'Preparando áudios...'
      });
      
      const audioFiles = await this.prepareAudioFiles(slides, jobDir);
      
      // Gerar vídeo final
      onProgress?.({
        phase: 'processing',
        progress: 40,
        message: 'Renderizando vídeo...',
        totalSlides: slides.length
      });
      
      const outputPath = await this.generateVideo(slideFiles, audioFiles, options, jobDir, (progress) => {
        onProgress?.({
          phase: 'processing',
          progress: 40 + (progress * 0.5), // 40% a 90%
          currentSlide: Math.ceil((progress / 100) * slides.length),
          totalSlides: slides.length,
          message: `Processando slide ${Math.ceil((progress / 100) * slides.length)}/${slides.length}...`
        });
      });
      
      onProgress?.({
        phase: 'finalizing',
        progress: 95,
        message: 'Finalizando vídeo...'
      });
      
      // Limpeza
      await this.cleanup(jobDir);
      
      onProgress?.({
        phase: 'completed',
        progress: 100,
        message: 'Vídeo renderizado com sucesso!'
      });

      return {
        success: true,
        videoPath: outputPath
      };

    } catch (error) {
      logger.error('❌ Erro na renderização FFmpeg', error as Error, { jobId });
      
      // Limpeza em caso de erro
      try {
        await this.cleanup(jobDir);
      } catch (cleanupError) {
        logger.warn('⚠️ Erro na limpeza', { error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) });
      }
      
      onProgress?.({
        phase: 'failed',
        progress: 0,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Prepara imagens dos slides
   */
  private async prepareSlideImages(slides: RenderSlide[], jobDir: string): Promise<string[]> {
    const slideFiles: string[] = [];
    
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const filename = `slide-${i + 1}.png`;
      const filepath = path.join(jobDir, filename);
      
      // Gerar imagem simples do slide (por enquanto, texto sobre fundo)
      await this.generateSlideImage(slide, filepath);
      slideFiles.push(filepath);
    }
    
    return slideFiles;
  }

  /**
   * Gera imagem de um slide usando texto simples
   */
  private async generateSlideImage(slide: RenderSlide, outputPath: string): Promise<void> {
    // Por enquanto, criar uma imagem simples com FFmpeg
    // Em produção, usar bibliotecas como Canvas ou Sharp
    
    const ffmpegArgs = [
      '-f', 'lavfi',
      '-i', `color=c=navy:s=1920x1080:d=${slide.duration}`,
      '-vf', `drawtext=text='${slide.content.replace(/'/g, "\\'")}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2`,
      '-frames:v', '1',
      '-y',
      outputPath
    ];
    
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ffmpegArgs);
      
      process.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg slide generation failed with code ${code}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  /**
   * Prepara arquivos de áudio
   */
  private async prepareAudioFiles(slides: RenderSlide[], jobDir: string): Promise<string[]> {
    const audioFiles: string[] = [];
    
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      
      if (slide.audioUrl && !slide.audioUrl.includes('mock') && !slide.audioUrl.includes('example')) {
        // Baixar áudio real
        try {
          const response = await fetch(slide.audioUrl);
          if (response.ok) {
            const audioBuffer = await response.arrayBuffer();
            const filename = `audio-${i + 1}.mp3`;
            const filepath = path.join(jobDir, filename);
            
            await fs.writeFile(filepath, Buffer.from(audioBuffer));
            audioFiles.push(filepath);
            continue;
          }
        } catch (error) {
          logger.warn(`⚠️ Falha ao baixar áudio do slide ${i + 1}, gerando silêncio`, { error });
        }
      }
      
      // Gerar silêncio como fallback
      const filename = `silence-${i + 1}.mp3`;
      const filepath = path.join(jobDir, filename);
      await this.generateSilence(slide.duration, filepath);
      audioFiles.push(filepath);
    }
    
    return audioFiles;
  }

  /**
   * Gera arquivo de silêncio
   */
  private async generateSilence(duration: number, outputPath: string): Promise<void> {
    const ffmpegArgs = [
      '-f', 'lavfi',
      '-i', `anullsrc=channel_layout=stereo:sample_rate=48000`,
      '-t', duration.toString(),
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      '-y',
      outputPath
    ];
    
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ffmpegArgs);
      
      process.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg silence generation failed with code ${code}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  /**
   * Gera vídeo final
   */
  private async generateVideo(
    slideFiles: string[],
    audioFiles: string[],
    options: RenderOptions,
    jobDir: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    
    const outputPath = path.join(jobDir, 'output.mp4');
    
    // Montar comando FFmpeg complexo
    const ffmpegArgs = this.buildFFmpegCommand(slideFiles, audioFiles, options, outputPath);
    
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ffmpegArgs);
      
      let duration = 0;
      process.stderr.on('data', (data) => {
        const output = data.toString();
        
        // Extrair duração total
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\./);
        if (durationMatch) {
          const [, hours, minutes, seconds] = durationMatch;
          duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
        }
        
        // Extrair progresso
        const progressMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\./);
        if (progressMatch && duration > 0) {
          const [, hours, minutes, seconds] = progressMatch;
          const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
          const progress = Math.min(100, (currentTime / duration) * 100);
          onProgress?.(progress);
        }
      });
      
      process.on('exit', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg video generation failed with code ${code}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  /**
   * Constrói comando FFmpeg
   */
  private buildFFmpegCommand(
    slideFiles: string[],
    audioFiles: string[],
    options: RenderOptions,
    outputPath: string
  ): string[] {
    
    const args: string[] = [];
    
    // Inputs
    slideFiles.forEach(file => {
      args.push('-loop', '1', '-i', file);
    });
    
    audioFiles.forEach(file => {
      args.push('-i', file);
    });
    
    // Filtros complexos para concatenação
    let filterComplex = '';
    
    // Vídeo
    for (let i = 0; i < slideFiles.length; i++) {
      filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS,fps=${options.fps}[v${i}];`;
    }
    
    // Concatenar vídeos
    filterComplex += slideFiles.map((_, i) => `[v${i}]`).join('') + `concat=n=${slideFiles.length}:v=1:a=0[outv];`;
    
    // Áudio
    filterComplex += audioFiles.map((_, i) => `[${i + slideFiles.length}:a]`).join('') + `concat=n=${audioFiles.length}:v=0:a=1[outa]`;
    
    args.push('-filter_complex', filterComplex);
    args.push('-map', '[outv]', '-map', '[outa]');
    
    // Configurações de qualidade
    args.push('-c:v', 'libx264');
    args.push('-preset', options.quality === 'high' ? 'slow' : 'medium');
    args.push('-crf', options.quality === 'high' ? '18' : options.quality === 'standard' ? '23' : '28');
    args.push('-c:a', 'aac', '-b:a', '128k');
    
    args.push('-y', outputPath);
    
    return args;
  }

  /**
   * Limpeza de arquivos temporários
   */
  private async cleanup(jobDir: string): Promise<void> {
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
      logger.info('🧹 Limpeza concluída', { jobDir });
    } catch (error) {
      logger.warn('⚠️ Falha na limpeza', { error, jobDir });
    }
  }
}