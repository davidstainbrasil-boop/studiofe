import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const voiceType = (formData.get('voiceType') as string) || 'professional';
    const templateId = (formData.get('templateId') as string) || 'modern';
    const slideDuration = (formData.get('slideDuration') as string) || '5';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Tipo de arquivo inválido. Envie apenas arquivos PPTX ou PPT.',
        },
        { status: 400 },
      );
    }

    // Criar diretório de uploads se não existir
    const uploadDir = join(process.cwd(), 'uploads', 'pptx');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Salvar arquivo temporariamente
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Iniciar processamento do PPTX
    const jobId = `job-${timestamp}`;

    // Criar registro do job
    const jobData = {
      id: jobId,
      filename,
      originalName: file.name,
      status: 'processing',
      progress: 0,
      settings: {
        voiceType,
        templateId,
        slideDuration: parseInt(slideDuration),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Salvar dados do job
    const jobsDir = join(process.cwd(), 'data', 'jobs');
    if (!existsSync(jobsDir)) {
      await mkdir(jobsDir, { recursive: true });
    }
    await writeFile(join(jobsDir, `${jobId}.json`), JSON.stringify(jobData, null, 2));

    // Iniciar processamento assíncrono
    processPPTXAsync(jobId, filepath, jobData.settings);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Arquivo recebido com sucesso! Processamento iniciado.',
      estimatedTime: '2-5 minutos',
    });
  } catch (error) {
    console.error('Erro no upload PPTX:', error);
    return NextResponse.json(
      {
        error: 'Erro interno no servidor',
      },
      { status: 500 },
    );
  }
}

async function processPPTXAsync(jobId: string, filepath: string, settings: any) {
  const { spawn } = require('child_process');
  const fs = require('fs').promises;
  const path = require('path');

  try {
    // Atualizar status para processing
    await updateJobStatus(jobId, 'processing', 10);

    // Extrair slides do PPTX usando Python
    const pythonScript = path.join(process.cwd(), 'scripts', 'extract_pptx.py');

    const extractProcess = spawn('python3', [
      pythonScript,
      '--input',
      filepath,
      '--output',
      path.join(process.cwd(), 'temp', jobId),
      '--format',
      'json',
    ]);

    let outputData = '';

    extractProcess.stdout.on('data', (data: any) => {
      outputData += data.toString();
    });

    extractProcess.stderr.on('data', (data: any) => {
      console.error('Erro na extração PPTX:', data.toString());
    });

    await new Promise((resolve, reject) => {
      extractProcess.on('close', async (code: number) => {
        if (code !== 0) {
          reject(new Error('Falha na extração do PPTX'));
          return;
        }
        resolve(code);
      });
    });

    await updateJobStatus(jobId, 'processing', 30);

    // Parsear slides extraídos
    const slidesData = JSON.parse(outputData);
    const totalSlides = slidesData.slides.length;

    await updateJobStatus(jobId, 'processing', 40);

    // Gerar áudio para cada slide
    const audioFiles = [];
    for (let i = 0; i < slidesData.slides.length; i++) {
      const slide = slidesData.slides[i];
      const audioFile = await generateAudioForSlide(slide.text, settings.voiceType, jobId, i);
      audioFiles.push(audioFile);

      // Atualizar progresso
      const progress = 40 + (30 * (i + 1)) / totalSlides;
      await updateJobStatus(jobId, 'processing', progress);
    }

    await updateJobStatus(jobId, 'processing', 70);

    // Criar vídeo usando FFmpeg
    const videoPath = await createVideoFromSlides(
      slidesData.slides,
      audioFiles,
      settings.templateId,
      settings.slideDuration,
      jobId,
    );

    await updateJobStatus(jobId, 'processing', 90);

    // Fazer upload para o storage (se configurado)
    let videoUrl = null;
    if (process.env.AWS_S3_BUCKET) {
      videoUrl = await uploadToStorage(videoPath, jobId);
    } else {
      videoUrl = `/videos/${jobId}.mp4`;
    }

    // Limpar arquivos temporários
    await cleanupTempFiles(jobId);

    // Finalizar job
    await updateJobStatus(jobId, 'completed', 100, {
      videoUrl,
      duration: totalSlides * settings.slideDuration,
      slidesCount: totalSlides,
    });
  } catch (error) {
    console.error('Erro no processamento PPTX:', error);
    await updateJobStatus(jobId, 'failed', 0, {
      error: error.message,
    });
  }
}

async function generateAudioForSlide(
  text: string,
  voiceType: string,
  jobId: string,
  slideIndex: number,
): Promise<string> {
  // Integração com ElevenLabs ou similar
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'scripts', 'generate_audio.py');

    const process = spawn('python3', [
      pythonScript,
      '--text',
      text,
      '--voice',
      voiceType,
      '--output',
      path.join(process.cwd(), 'temp', jobId, `audio_${slideIndex}.mp3`),
    ]);

    process.on('close', (code: number) => {
      if (code === 0) {
        resolve(path.join(process.cwd(), 'temp', jobId, `audio_${slideIndex}.mp3`));
      } else {
        reject(new Error('Falha na geração de áudio'));
      }
    });
  });
}

async function createVideoFromSlides(
  slides: any[],
  audioFiles: string[],
  templateId: string,
  slideDuration: number,
  jobId: string,
): Promise<string> {
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs').promises;

  // Criar lista de arquivos para FFmpeg
  const fileList = path.join(process.cwd(), 'temp', jobId, 'filelist.txt');
  let fileListContent = '';

  for (let i = 0; i < slides.length; i++) {
    const slidePath = slides[i].imagePath;
    const audioPath = audioFiles[i];
    fileListContent += `file '${slidePath}'\n`;
    fileListContent += `duration ${slideDuration}\n`;
  }

  await fs.writeFile(fileList, fileListContent);

  const outputPath = path.join(process.cwd(), 'videos', `${jobId}.mp4`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      fileList,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      outputPath,
    ]);

    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error('Falha na criação do vídeo'));
      }
    });
  });
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

async function uploadToStorage(videoPath: string, jobId: string): Promise<string> {
  // Implementar upload para S3 ou outro storage
  // Por ora, retorna URL local
  return `/videos/${jobId}.mp4`;
}

async function cleanupTempFiles(jobId: string) {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    const tempDir = path.join(process.cwd(), 'temp', jobId);
    await fs.rmdir(tempDir, { recursive: true });
  } catch (error) {
    console.error('Erro na limpeza de arquivos temporários:', error);
  }
}
