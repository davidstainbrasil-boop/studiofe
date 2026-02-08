
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { WatermarkSettingsSchema } from '@/types/watermark.types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

const RouteContextSchema = z.object({
  params: z.object({
    jobId: z.string(),
  }),
});

export async function POST(req: Request, context: z.infer<typeof RouteContextSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const { params } = RouteContextSchema.parse(context);
  const { jobId } = params;

  const requestBody = await req.json();

  try {
    const watermarkSettings = WatermarkSettingsSchema.parse(requestBody);

    const job = await prisma.render_jobs.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Render job não encontrado.' }, { status: 404 });
    }

    const currentSettings = (job.settings as object) || {};
    const updatedSettings = {
      ...currentSettings,
      watermark: watermarkSettings,
    };

    await prisma.render_jobs.update({
      where: { id: jobId },
      data: {
        settings: updatedSettings,
      },
    });

    logger.info(`Configurações de marca d'água atualizadas para o job: ${jobId}`);

    return NextResponse.json({ success: true, settings: updatedSettings });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Falha na validação das configurações de marca d\'água', { errors: error.errors });
      return NextResponse.json({ error: 'Dados de marca d\'água inválidos.', details: error.errors }, { status: 400 });
    }

    logger.error(`Erro ao atualizar as configurações de marca d'água para o job: ${jobId}`, error as Error);
    return NextResponse.json({ error: 'Ocorreu um erro interno.' }, { status: 500 });
  }
}
