import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/database/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const videoId = params.id;
    const { formats, options } = await request.json();

    if (!formats || !Array.isArray(formats)) {
      return NextResponse.json({
        error: 'Formatos inválidos'
      }, { status: 400 });
    }

    const validFormats = ['mp4', 'webm', 'mov', 'gif'];
    const invalidFormats = formats.filter(f => !validFormats.includes(f));

    if (invalidFormats.length > 0) {
      return NextResponse.json({
        error: `Formatos não suportados: ${invalidFormats.join(', ')}`
      }, { status: 400 });
    }

    // Get video details
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId: session.user.id
      },
      include: {
        project: true
      }
    });

    if (!video) {
      return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 });
    }

    // Create export job
    const exportJob = await prisma.exportJob.create({
      data: {
        videoId,
        userId: session.user.id,
        formats: formats,
        options: {
          quality: options.quality || 'high',
          includeWatermark: options.includeWatermark !== false,
          resolution: options.resolution || '1920x1080',
          audioFormat: options.audioFormat || 'mp3'
        },
        status: 'processing',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60) // 24 hours
      }
    });

    // Start processing
    processVideoExport(exportJob.id, video, formats, options);

    return NextResponse.json({
      success: true,
      jobId: exportJob.id,
      message: 'Exportação iniciada',
      estimatedTime: '2-10 minutos'
    });

  } catch (error) {
    console.error('Erro na exportação do vídeo:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}

async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const exportJobId = params.id;
    
    const exportJob = await prisma.exportJob.findFirst({
      where: {
        id: exportJobId,
        userId: session.user.id
      },
      include: {
        video: {
          include: {
            project: true
          }
        }
      }
    });

    if (!exportJob) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job: exportJob
    });

  } catch (error) {
    console.error('Erro ao buscar job de exportação:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const exportJobId = params.id;
    
    // Cancel and delete export job
    await prisma.exportJob.delete({
      where: {
        id: exportJobId,
        userId: session.user.id
      }
    });

    // Clean up temporary files
    const fs = require('fs').promises;
    const tempDir = `/tmp/exports/${exportJobId}`;
    if (await fs.access(tempDir).catch(() => false)) {
      await fs.rm(tempDir, { recursive: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Exportação cancelada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cancelar exportação:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

async function processVideoExport(
  exportJobId: string,
  video: any,
  formats: string[],
  options: any
) {
  const fs = require('fs').promises;
  const { spawn } = require('child_process');
  const path = require('path');

  try {
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: 'processing',
        progress: 10
      }
    });

    const tempDir = `/tmp/exports/${exportJobId}`;
    await fs.mkdir(tempDir, { recursive: true });

    // Get video file path
    let videoPath = video.url;
    if (!videoPath?.startsWith('http')) {
      videoPath = path.join(process.cwd(), 'videos', `${exportJobId}-source.mp4`);
    }

    // Download video if needed
    if (!fs.existsSync(videoPath)) {
      console.log('Baixando vídeo para exportação...');
      // Implementation would download from storage
    }

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: 'processing',
        progress: 30
      }
    });

    const outputs = [];

    for (const format of formats) {
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: {
          status: 'processing',
          progress: 50
        }
      });

      const outputPath = path.join(tempDir, `${exportJobId}.${format}`);
      
      try {
        // FFmpeg export command
        const ffmpegArgs = [
          '-i', videoPath,
          '-c:v', getCodecForFormat(format),
          '-crf', '23',
          '-preset', getPresetForFormat(format),
          '-vf', `scale=${options.resolution}`,
          '-movflags', '+faststart',
          '-pix_fmt', getPixelFormatForFormat(format),
          outputPath
        ];

        await new Promise((resolve, reject) => {
          const process = spawn('ffmpeg', ffmpegArgs);
          
          process.on('close', async (code) => {
            if (code === 0) {
              resolve(undefined);
            } else {
              reject(new Error(`FFmpeg failed with code ${code}`));
            }
          });
          
          process.on('error', (error) => {
            console.error('FFmpeg error:', error);
            reject(error);
          });
        });

        outputs.push({
          format,
          path: outputPath,
          success: true
        });

        await prisma.exportJob.update({
          where: { id: exportJobId },
          data: {
            status: 'processing',
            progress: 70
          }
        });

      } catch (error) {
        outputs.push({
          format,
          path: null,
          success: false,
          error: error.message
        });
      }
    }

    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: 'completed',
        progress: 100,
        outputs: outputs.map(o => ({
          format: o.format,
          path: o.path,
          success: o.success,
          error: o.error ? o.error.message : null,
          fileSize: o.success ? (await getFileSize(o.path)) : null
        })),
        completedAt: new Date()
      }
    });

    // Clean up temporary files
    if (await fs.access(tempDir).catch(() => false)) {
      await fs.rm(tempDir, { recursive: true });
    }

  } catch (error) {
    console.error('Erro no processamento da exportação:', error);
    
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: 'failed',
        error: error.message
      }
    });
  }
}

function getCodecForFormat(format: string): string {
  const codecs: { [string, string] = {
    'mp4': 'libx264',
    'webm': 'libvpx-vp9',
    'mov': 'prores_422',
    'gif': 'gif'
  };
  
  return codecs[format] || 'libx264';
}

function getPresetForFormat(format: string): string {
  const presets = { [string, string] = {
    'mp4': 'medium',
    'webm': 'default',
    'mov': 'high',
    'gif': 'default'
  };
  
  return presets[format] || 'medium';
}

function getPixelFormatForFormat(format: string): string {
  const formats: { [string, string] = {
    'mp4': 'yuv420p',
    'webm': 'yuv420p',
    'mov': 'yuv444',
    'gif': 'gif'
  };
  
  return formats[format] || 'yuv420p';
}

async function getFileSize(filePath: string): Promise<number> {
  const fs = require('fs').promises;
  const stats = await fs.stat(filePath);
  return stats.size;
}

// Create necessary directory if it doesn't exist
const createDir = async (dirPath: string) => {
  const fs = require('fs').promises;
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};