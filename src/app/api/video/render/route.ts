import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface VideoProject {
  id: string;
  title: string;
  description: string;
  template: any;
  slides: any[];
  settings: {
    resolution: string;
    frameRate: number;
    quality: string;
    backgroundMusic: boolean;
    autoCaptions: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const project: VideoProject = await request.json();

    // Validar projeto
    if (!project.slides || project.slides.length === 0) {
      return NextResponse.json(
        {
          error: 'Projeto deve ter pelo menos um slide',
        },
        { status: 400 },
      );
    }

    // Gerar ID único
    const jobId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Criar diretórios
    const outputDir = join(process.cwd(), 'temp', 'video', jobId);
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Salvar projeto
    const projectPath = join(outputDir, 'project.json');
    await writeFile(projectPath, JSON.stringify(project, null, 2));

    // Iniciar renderização
    renderVideoAsync(jobId, project, outputDir);

    // Criar job data
    const jobData = {
      id: jobId,
      type: 'video_render',
      status: 'processing',
      progress: 0,
      project: project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const jobsDir = join(process.cwd(), 'data', 'jobs');
    if (!existsSync(jobsDir)) {
      await mkdir(jobsDir, { recursive: true });
    }
    await writeFile(join(jobsDir, `${jobId}.json`), JSON.stringify(jobData, null, 2));

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Renderização do vídeo iniciada',
      estimatedTime: estimateRenderTime(project),
    });
  } catch (error) {
    console.error('Erro na renderização de vídeo:', error);
    return NextResponse.json(
      {
        error: 'Erro interno no servidor',
      },
      { status: 500 },
    );
  }
}

async function renderVideoAsync(jobId: string, project: VideoProject, outputDir: string) {
  try {
    await updateJobStatus(jobId, 'processing', 10);

    // Etapa 1: Preparar slides
    const slideData = await prepareSlides(project.slides, outputDir);
    await updateJobStatus(jobId, 'processing', 30);

    // Etapa 2: Gerar áudios
    const audioData = await generateAudios(slideData, outputDir);
    await updateJobStatus(jobId, 'processing', 50);

    // Etapa 3: Renderizar vídeo
    const videoPath = await renderFinalVideo(slideData, audioData, project, outputDir);
    await updateJobStatus(jobId, 'processing', 80);

    // Etapa 4: Adicionar legendas (se habilitado)
    if (project.settings.autoCaptions) {
      await addCaptions(videoPath, outputDir);
    }
    await updateJobStatus(jobId, 'processing', 90);

    // Etapa 5: Upload para storage
    let videoUrl: string | null = null;
    if (process.env.AWS_S3_BUCKET) {
      videoUrl = await uploadToStorage(videoPath, jobId);
    } else {
      videoUrl = `/videos/${jobId}.mp4`;
    }

    // Limpar arquivos temporários
    await cleanupTempFiles(outputDir);

    // Finalizar
    await updateJobStatus(jobId, 'completed', 100, {
      videoUrl,
      duration: await getVideoDuration(videoPath),
      fileSize: await getFileSize(videoPath),
    });
  } catch (error) {
    console.error('Erro na renderização:', error);
    await updateJobStatus(jobId, 'failed', 0, {
      error: error.message,
    });
  }
}

async function prepareSlides(slides: any[], outputDir: string): Promise<any[]> {
  const { spawn } = require('child_process');
  const path = require('path');

  return Promise.all(
    slides.map(async (slide, index) => {
      const slideDir = path.join(outputDir, `slide_${index}`);
      await mkdir(slideDir, { recursive: true });

      // Gerar imagem do slide
      const imagePath = await generateSlideImage(slide, slideDir);

      return {
        ...slide,
        imagePath,
        index,
      };
    }),
  );
}

async function generateSlideImage(slide: any, outputDir: string): Promise<string> {
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs').promises;

  const imagePath = path.join(outputDir, 'slide.png');

  // Usar Python para gerar imagem do slide
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'scripts', 'generate_slide_image.py');

    const childProcess = spawn('python3', [
      pythonScript,
      '--title',
      slide.title || '',
      '--content',
      slide.content || '',
      '--output',
      imagePath,
      '--template',
      slide.template || 'modern',
    ]);

    childProcess.on('close', (code: number) => {
      if (code === 0) {
        resolve(imagePath);
      } else {
        reject(new Error(`Falha na geração da imagem (código ${code})`));
      }
    });
  });
}

async function generateAudios(slides: any[], outputDir: string): Promise<any[]> {
  return Promise.all(
    slides
      .map(async (slide) => {
        if (!slide.voiceSettings?.text) return null;

        try {
          // Implementação real com ElevenLabs
          const { ElevenLabsClient } = require('elevenlabs');
          const fs = require('fs').promises;
          const path = require('path');

          const client = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
          });

          // Mapear voice settings para IDs reais
          const voiceMap: Record<string, string> = {
            'professional-male': 'adam',
            'professional-female': 'bella',
            'male': 'josh',
            'female': 'rachel',
            'child': 'sam',
          };

          const voiceId = voiceMap[slide.voiceSettings.voiceType] || 'adam';

          // Gerar áudio real
          const audio = await client.generate({
            voice: voiceId,
            text: slide.voiceSettings.text,
            model_id: 'eleven_monolingual_v1',
          });

          // Salvar áudio
          const audioPath = path.join(outputDir, `audio_${slide.index}.mp3`);
          await fs.writeFile(audioPath, audio);

          return {
            slideIndex: slide.index,
            audioPath,
            duration: await getAudioDuration(audioPath),
          };
        } catch (error) {
          console.error('Erro ao gerar áudio para slide', slide.index, error);
          
          // Fallback para TTS local
          try {
            const { spawn } = require('child_process');
            const path = require('path');
            
            const audioPath = path.join(outputDir, `audio_${slide.index}.mp3`);
            const pythonScript = path.join(process.cwd(), 'scripts', 'tts_fallback.py');

            await new Promise((resolve, reject) => {
              const childProcess = spawn('python3', [
                pythonScript,
                '--text', slide.voiceSettings.text,
                '--voice', slide.voiceSettings.voiceType || 'male',
                '--output', audioPath
              ]);

              childProcess.on('close', (code: number) => {
                if (code === 0) resolve(code);
                else reject(new Error(`TTS fallback failed with code ${code}`));
              });
            });

            return {
              slideIndex: slide.index,
              audioPath,
              duration: await getAudioDuration(audioPath),
            };
          } catch (fallbackError) {
            console.error('Fallback TTS também falhou:', fallbackError);
            return null;
          }
        }
      })
      .filter(Boolean),
  );
}

async function renderFinalVideo(
  slides: any[],
  audios: any[],
  project: VideoProject,
  outputDir: string,
): Promise<string> {
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, 'final.mp4');

    // Criar lista de arquivos para FFmpeg
    const fileListPath = path.join(outputDir, 'filelist.txt');
    let fileListContent = '';

    slides.forEach((slide, index) => {
      const duration = slide.duration || 5;
      fileListContent += `file '${slide.imagePath}'\n`;
      fileListContent += `duration ${duration}\n`;
    });

    require('fs').writeFileSync(fileListPath, fileListContent);

    // Comando FFmpeg básico
    const ffmpegArgs = [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      fileListPath,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-r',
      project.settings.frameRate.toString(),
      '-vf',
      `scale=${project.settings.resolution.split('x').join(':')}`,
      '-preset',
      'medium',
      '-crf',
      '23',
      '-y',
      outputPath,
    ];

    // Adicionar áudio se disponível
    const audioFiles = audios?.filter((a) => a?.audioPath);
    if (audioFiles?.length > 0) {
      ffmpegArgs.splice(-5, 0, '-i', audioFiles[0].audioPath);
      ffmpegArgs.splice(-2, 0, '-c:a', 'aac', '-shortest');
    }

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg falhou com código ${code}`));
      }
    });

    ffmpeg.stderr.on('data', (data: Buffer) => {
      console.error('FFmpeg stderr:', data.toString());
    });
  });
}

async function addCaptions(videoPath: string, outputDir: string): Promise<void> {
  const { spawn } = require('child_process');
  const path = require('path');

  // Gerar legendas usando o script Python
  const captionsScript = path.join(process.cwd(), 'scripts', 'generate_captions.py');

  return new Promise((resolve, reject) => {
    const process = spawn('python3', [
      captionsScript,
      '--input',
      videoPath,
      '--output-dir',
      outputDir,
      '--formats',
      'srt',
      '--language',
      'pt',
    ]);

    process.on('close', (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Geração de legendas falhou (código ${code})`));
      }
    });
  });
}

async function uploadToStorage(videoPath: string, jobId: string): Promise<string> {
  try {
    const s3Storage = require('@/lib/storage/s3-storage').default;
    const result = await s3Storage.uploadFile(videoPath, `videos/${jobId}.mp4`, 'video/mp4', true);
    return result.url;
  } catch (error) {
    console.error('Erro no upload S3:', error);
    return `/videos/${jobId}.mp4`;
  }
}

function estimateRenderTime(project: VideoProject): string {
  const baseMinutes = 3;
  const slidesCount = project.slides.length;
  const quality = project.settings.quality;

  const qualityMultipliers = {
    low: 0.5,
    medium: 1,
    high: 2,
    ultra: 4,
  };

  const estimatedMinutes = Math.round(
    baseMinutes *
      slidesCount *
      (qualityMultipliers[quality as keyof typeof qualityMultipliers] || 1),
  );

  if (estimatedMinutes < 1) {
    return 'menos de 1 minuto';
  } else if (estimatedMinutes <= 5) {
    return `${estimatedMinutes} minutos`;
  } else {
    return `${Math.round((estimatedMinutes / 60) * 10) / 10} horas`;
  }
}

async function updateJobStatus(jobId: string, status: string, progress: number, data?: any) {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    const jobFile = path.join(process.cwd(), 'data', 'jobs', `${jobId}.json`);
    const jobData = JSON.parse(await fs.readFile(jobFile, 'utf8'));

    jobData.status = status;
    jobData.progress = progress;
    jobData.updatedAt = new Date().toISOString();

    if (data) {
      jobData.data = { ...jobData.data, ...data };
    }

    await fs.writeFile(jobFile, JSON.stringify(jobData, null, 2));
  } catch (error) {
    console.error('Erro ao atualizar status do job:', error);
  }
}

async function cleanupTempFiles(outputDir: string) {
  const fs = require('fs').promises;
  try {
    await fs.rmdir(outputDir, { recursive: true });
  } catch (error) {
    console.error('Erro na limpeza:', error);
  }
}

async function getVideoDuration(videoPath: string): Promise<number> {
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on('close', () => {
      const duration = parseFloat(output.trim());
      resolve(duration || 0);
    });
  });
}

async function getFileSize(filePath: string): Promise<number> {
  const fs = require('fs').promises;
  const stats = await fs.stat(filePath);
  return stats.size;
}

async function getAudioDuration(audioPath: string): Promise<number> {
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    ffprobe.on('close', () => {
      const duration = parseFloat(output.trim());
      resolve(duration || 0);
    });
  });
}
