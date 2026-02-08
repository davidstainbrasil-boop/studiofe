import 'openai/shims/node';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { TranscriptionService } from '@lib/subtitles/transcription-service';
import { prisma } from '@lib/prisma';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { uploadSubtitleFile } from '@lib/subtitles/subtitle-storage';
import { promises as fs } from 'fs';
import path from 'path';
import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const audioPath = formData.get('audioPath') as string;
    const language = (formData.get('language') as string) || 'pt-BR';
    const enableKaraoke = formData.get('enableKaraoke') === 'true';
    const enableSpeakerDiarization = formData.get('enableSpeakerDiarization') === 'true';
    const maxSpeakers = parseInt(formData.get('maxSpeakers') as string) || 2;
    const formUserId = formData.get('userId') as string;
    const projectId = formData.get('projectId') as string | null;

    const authSupabase = getSupabaseForRequest(request);
    const {
      data: { session },
    } = await authSupabase.auth.getSession();
    const userId = session?.user?.id || formUserId;

    if (!file && !audioPath) {
      return NextResponse.json(
        { error: 'Arquivo de áudio ou caminho do arquivo é necessário' },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let finalAudioPath: string;

    if (file) {
      // Save uploaded file to temp directory
      const tempDir = path.join(process.cwd(), 'temp', 'uploads');
      await fs.mkdir(tempDir, { recursive: true });

      // SECURITY: Sanitize filename to prevent path traversal
      const safeOriginalName = path.basename(file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}_${safeOriginalName}`;
      
      const filePath = path.join(tempDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      finalAudioPath = filePath;
    } else if (audioPath) {
      finalAudioPath = audioPath;
    } else {
      return NextResponse.json({ error: 'Nenhum arquivo válido fornecido' }, { status: 400 });
    }

    const transcriptionService = TranscriptionService.getInstance();

    // Transcribe the audio
    const result = await transcriptionService.transcribeAudio(finalAudioPath, {
      language,
      enableKaraoke,
      enableSpeakerDiarization,
      maxSpeakers,
    });

    // Generate subtitle files
    const karaokeSubtitles = enableKaraoke
      ? transcriptionService.generateKaraokeSubtitles(result)
      : null;

    const srtSubtitles = transcriptionService.generateSRT(result);
    const vttSubtitles = transcriptionService.generateVTT(result);

    // Upload subtitle files to storage
    const srtUpload = await uploadSubtitleFile({
      content: srtSubtitles,
      extension: 'srt',
      projectId,
      language,
      kind: 'srt',
    });

    const vttUpload = await uploadSubtitleFile({
      content: vttSubtitles,
      extension: 'vtt',
      projectId,
      language,
      kind: 'vtt',
    });

    const karaokeUpload = karaokeSubtitles
      ? await uploadSubtitleFile({
          content: karaokeSubtitles,
          extension: 'ass',
          projectId,
          language,
          kind: 'karaoke',
        })
      : null;

    // Save transcription to database
    const transcriptionData = await prisma.transcriptions.create({
      data: {
        userId: userId,
        projectId: projectId || undefined,
        audioPath: finalAudioPath,
        language,
        duration: result.duration,
        confidence: result.confidence,
        wordCount: result.wordCount,
        segments: JSON.parse(JSON.stringify(result.segments)) as Prisma.InputJsonValue,
        karaokeEnabled: enableKaraoke,
        speakerDiarizationEnabled: enableSpeakerDiarization,
        srtUrl: srtUpload.url,
        vttUrl: vttUpload.url,
        karaokeUrl: karaokeUpload?.url,
      },
      select: { id: true },
    });

    await prisma.subtitle_tracks.create({
      data: {
        transcriptionId: transcriptionData.id,
        language,
        segments: JSON.parse(JSON.stringify(result.segments)) as Prisma.InputJsonValue,
        srtUrl: srtUpload.url,
        vttUrl: vttUpload.url,
      },
    });

    // Clean up temp file if it was uploaded
    if (file) {
      try {
        await fs.unlink(finalAudioPath);
      } catch (cleanupError) {
        logger.warn('Failed to clean up temp file:', { component: 'API: subtitles/transcribe' });
      }
    }

    return NextResponse.json({
      success: true,
      transcription: result,
      karaokeSubtitles,
      srtSubtitles,
      vttSubtitles,
      transcriptionId: transcriptionData.id,
      srtUrl: srtUpload.url,
      vttUrl: vttUpload.url,
      karaokeUrl: karaokeUpload?.url,
    });
  } catch (error) {
    logger.error(
      'Transcription API error:',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: subtitles/transcribe' },
    );
    return NextResponse.json(
      {
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'subtitles-transcribe-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const transcriptionId = searchParams.get('transcriptionId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const data = await prisma.transcriptions.findMany({
      where: {
        userId,
        ...(transcriptionId ? { id: transcriptionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      transcriptions: data,
    });
  } catch (error) {
    logger.error(
      'Get transcriptions API error:',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: subtitles/transcribe' },
    );
    return NextResponse.json(
      {
        error: 'Failed to fetch transcriptions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const transcriptionId = searchParams.get('transcriptionId');
    const userId = searchParams.get('userId');

    if (!transcriptionId || !userId) {
      return NextResponse.json(
        { error: 'Transcription ID and User ID are required' },
        { status: 400 },
      );
    }

    await prisma.transcriptions.deleteMany({
      where: {
        id: transcriptionId,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Transcription deleted successfully',
    });
  } catch (error) {
    logger.error(
      'Delete transcription API error:',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'API: subtitles/transcribe' },
    );
    return NextResponse.json(
      {
        error: 'Failed to delete transcription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
