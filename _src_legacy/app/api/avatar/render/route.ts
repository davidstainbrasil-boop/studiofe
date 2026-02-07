import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface AvatarConfig {
  modelId: string;
  appearance: {
    gender: 'male' | 'female' | 'neutral';
    age: number;
    ethnicity: string;
    hairStyle: string;
    clothing: string;
  };
  animation: {
    pose: string;
    expression: string;
    gestures: string[];
    background: string;
  };
  voice: {
    voiceId: string;
    pitch: number;
    speed: number;
    volume: number;
  };
  rendering: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    resolution: string;
    format: 'mp4' | 'webm' | 'mov';
    frameRate: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const config: AvatarConfig = await request.json();

    // Validar configuração
    const validation = validateAvatarConfig(config);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Configuração inválida',
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    // Gerar ID único para o job
    const jobId = `avatar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Criar diretórios se não existirem
    const outputDir = join(process.cwd(), 'temp', 'avatar', jobId);
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Salvar configuração
    const configPath = join(outputDir, 'config.json');
    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Iniciar renderização assíncrona
    renderAvatarAsync(jobId, config, outputDir);

    // Atualizar status do job
    const jobData = {
      id: jobId,
      type: 'avatar_render',
      status: 'processing',
      progress: 0,
      config: config,
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
      message: 'Renderização do avatar iniciada',
      estimatedTime: getEstimatedRenderTime(config),
    });
  } catch (error) {
    console.error('Erro na API de avatar:', error);
    return NextResponse.json(
      {
        error: 'Erro interno no servidor',
      },
      { status: 500 },
    );
  }
}

async function renderAvatarAsync(jobId: string, config: AvatarConfig, outputDir: string) {
  const { spawn } = require('child_process');
  const path = require('path');

  try {
    await updateJobStatus(jobId, 'processing', 10);

    // Etapa 1: Gerar modelo 3D do avatar
    const modelPath = await generateAvatarModel(config, outputDir);
    await updateJobStatus(jobId, 'processing', 30);

    // Etapa 2: Criar animações e expressões
    const animationData = await generateAnimations(config, outputDir);
    await updateJobStatus(jobId, 'processing', 50);

    // Etapa 3: Renderizar com Unreal Engine (ou alternativa)
    const videoPath = await renderWithUnrealEngine(modelPath, animationData, config, outputDir);
    await updateJobStatus(jobId, 'processing', 80);

    // Etapa 4: Pós-processamento (cor, áudio, etc)
    const finalVideoPath = await postProcessVideo(videoPath, config, outputDir);
    await updateJobStatus(jobId, 'processing', 90);

    // Etapa 5: Upload para storage
    let videoUrl = null;
    if (process.env.AWS_S3_BUCKET) {
      videoUrl = await uploadVideoToStorage(finalVideoPath, jobId);
    } else {
      videoUrl = `/videos/avatar/${jobId}.mp4`;
    }

    // Limpar arquivos temporários
    await cleanupTempFiles(outputDir);

    // Finalizar job
    await updateJobStatus(jobId, 'completed', 100, {
      videoUrl,
      duration: await getVideoDuration(finalVideoPath),
      fileSize: await getFileSize(finalVideoPath),
    });
  } catch (error) {
    console.error('Erro na renderização do avatar:', error);
    await updateJobStatus(jobId, 'failed', 0, {
      error: error.message,
    });
  }
}

async function generateAvatarModel(config: AvatarConfig, outputDir: string): Promise<string> {
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'scripts', 'generate_avatar_model.py');

    const process = spawn('python3', [
      pythonScript,
      '--config',
      path.join(outputDir, 'config.json'),
      '--output',
      path.join(outputDir, 'model.fbx'),
      '--quality',
      config.rendering.quality,
    ]);

    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      console.error('Erro na geração do modelo:', data.toString());
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(path.join(outputDir, 'model.fbx'));
      } else {
        reject(new Error(`Falha na geração do modelo (código ${code})`));
      }
    });
  });
}

async function generateAnimations(config: AvatarConfig, outputDir: string): Promise<string> {
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'scripts', 'generate_animations.py');

    const process = spawn('python3', [
      pythonScript,
      '--model',
      path.join(outputDir, 'model.fbx'),
      '--config',
      path.join(outputDir, 'config.json'),
      '--output',
      path.join(outputDir, 'animations.json'),
    ]);

    process.on('close', (code) => {
      if (code === 0) {
        resolve(path.join(outputDir, 'animations.json'));
      } else {
        reject(new Error(`Falha na geração de animações (código ${code})`));
      }
    });
  });
}

async function renderWithUnrealEngine(
  modelPath: string,
  animationData: string,
  config: AvatarConfig,
  outputDir: string,
): Promise<string> {
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    // Verificar se Unreal Engine está disponível
    const uePath = process.env.UNREAL_ENGINE_PATH || '/usr/local/unreal-engine';

    if (!existsSync(uePath)) {
      // Fallback para renderização com Blender
      return renderWithBlender(modelPath, animationData, config, outputDir)
        .then(resolve)
        .catch(reject);
    }

    const process = spawn(`${uePath}/Engine/Binaries/Linux/UE4Editor-Cmd`, [
      path.join(process.cwd(), 'unreal', 'AvatarRenderer'),
      '-run=RenderMovie',
      '-movie=' + path.join(outputDir, 'render_config.json'),
    ]);

    process.on('close', (code) => {
      if (code === 0) {
        resolve(path.join(outputDir, 'render.mp4'));
      } else {
        reject(new Error(`Falha na renderização Unreal (código ${code})`));
      }
    });
  });
}

async function renderWithBlender(
  modelPath: string,
  animationData: string,
  config: AvatarConfig,
  outputDir: string,
): Promise<string> {
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'scripts', 'render_with_blender.py');

    const process = spawn('blender', [
      '--background',
      '--python',
      pythonScript,
      '--',
      '--model',
      modelPath,
      '--animations',
      animationData,
      '--output',
      path.join(outputDir, 'render.mp4'),
      '--resolution',
      config.rendering.resolution,
      '--fps',
      config.rendering.frameRate.toString(),
    ]);

    process.on('close', (code) => {
      if (code === 0) {
        resolve(path.join(outputDir, 'render.mp4'));
      } else {
        reject(new Error(`Falha na renderização Blender (código ${code})`));
      }
    });
  });
}

async function postProcessVideo(
  videoPath: string,
  config: AvatarConfig,
  outputDir: string,
): Promise<string> {
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, 'final.mp4');

    const ffmpegArgs = [
      '-i',
      videoPath,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ];

    // Adicionar filtros de cor se necessário
    if (config.rendering.quality === 'high' || config.rendering.quality === 'ultra') {
      ffmpegArgs.splice(-4, 0, '-vf', 'eq=contrast=1.1:brightness=0.05:saturation=1.1');
    }

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Falha no pós-processamento (código ${code})`));
      }
    });
  });
}

async function uploadVideoToStorage(videoPath: string, jobId: string): Promise<string> {
  try {
    // Importar serviço S3 (se disponível)
    const s3Storage = require('@/lib/storage/s3-storage').default;

    const result = await s3Storage.uploadFile(
      videoPath,
      `avatars/${jobId}.mp4`,
      'video/mp4',
      true, // público
    );

    return result.url;
  } catch (error) {
    console.error('Erro no upload para S3:', error);
    // Fallback para URL local
    return `/videos/avatar/${jobId}.mp4`;
  }
}

function validateAvatarConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validações básicas
  if (!config.modelId) {
    errors.push('modelId é obrigatório');
  }

  if (!config.appearance) {
    errors.push('appearance é obrigatório');
  } else {
    const validGenders = ['male', 'female', 'neutral'];
    if (!validGenders.includes(config.appearance.gender)) {
      errors.push('gender inválido');
    }

    if (!config.appearance.age || config.appearance.age < 18 || config.appearance.age > 100) {
      errors.push('age deve estar entre 18 e 100');
    }
  }

  if (!config.rendering) {
    errors.push('rendering é obrigatório');
  } else {
    const validQualities = ['low', 'medium', 'high', 'ultra'];
    if (!validQualities.includes(config.rendering.quality)) {
      errors.push('quality inválida');
    }

    const validFormats = ['mp4', 'webm', 'mov'];
    if (!validFormats.includes(config.rendering.format)) {
      errors.push('format inválido');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function getEstimatedRenderTime(config: AvatarConfig): string {
  const baseMinutes = 5;
  const qualityMultipliers = {
    low: 0.5,
    medium: 1,
    high: 2,
    ultra: 4,
  };

  const resolutionMultipliers = {
    '720p': 0.5,
    '1080p': 1,
    '4k': 3,
  };

  const resolution = config.rendering.resolution.toLowerCase();
  const multiplier =
    (qualityMultipliers[config.rendering.quality] || 1) * (resolutionMultipliers[resolution] || 1);

  const estimatedMinutes = Math.round(baseMinutes * multiplier);

  if (estimatedMinutes < 1) {
    return 'menos de 1 minuto';
  } else if (estimatedMinutes === 1) {
    return 'aproximadamente 1 minuto';
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
    console.error('Erro na limpeza de arquivos temporários:', error);
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
    ffprobe.stdout.on('data', (data) => {
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
