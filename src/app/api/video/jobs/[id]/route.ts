import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const jobId = params.id;
    const jobFile = join(process.cwd(), 'data', 'jobs', `${jobId}.json`);

    if (!existsSync(jobFile)) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    const jobData = JSON.parse(require('fs').readFileSync(jobFile, 'utf8'));

    return NextResponse.json({
      success: true,
      job: jobData,
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return NextResponse.json(
      {
        error: 'Erro interno no servidor',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const jobId = params.id;
    const jobFile = join(process.cwd(), 'data', 'jobs', `${jobId}.json`);

    if (!existsSync(jobFile)) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    const jobData = JSON.parse(require('fs').readFileSync(jobFile, 'utf8'));

    if (jobData.status === 'completed') {
      return NextResponse.json(
        {
          error: 'Job já finalizado, não pode ser cancelado',
        },
        { status: 400 },
      );
    }

    // Atualizar status para cancelled
    jobData.status = 'cancelled';
    jobData.progress = 0;
    jobData.updatedAt = new Date().toISOString();

    require('fs').writeFileSync(jobFile, JSON.stringify(jobData, null, 2));

    // Limpar arquivos temporários
    await cleanupTempFiles(jobId);

    return NextResponse.json({
      success: true,
      message: 'Job cancelado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao cancelar job:', error);
    return NextResponse.json(
      {
        error: 'Erro interno no servidor',
      },
      { status: 500 },
    );
  }
}

async function cleanupTempFiles(jobId: string) {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    const tempDir = path.join(process.cwd(), 'temp', jobId);
    if (existsSync(tempDir)) {
      await fs.rmdir(tempDir, { recursive: true });
    }
  } catch (error) {
    console.error('Erro na limpeza de arquivos temporários:', error);
  }
}
