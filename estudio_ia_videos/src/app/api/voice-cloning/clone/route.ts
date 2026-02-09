import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { ElevenLabsService } from '@lib/elevenlabs-service'
import { prisma } from '@lib/prisma'
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

// POST - Voice Cloning (Implementação Real)
export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const formData = await request.formData()
    
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const labels = formData.getAll('labels[]') as string[]
    const files = formData.getAll('files') as File[]

    // Validate required fields
    if (!name || files.length === 0) {
      return NextResponse.json(
        { error: 'name and at least one file are required' },
        { status: 400 }
      )
    }

    // Validate file types
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a']
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type}` },
          { status: 400 }
        )
      }
    }

    // Verificar API Key
    if (!process.env.ELEVENLABS_API_KEY) {
        logger.warn('Tentativa de clonagem de voz sem ELEVENLABS_API_KEY configurada', { component: 'API: /api/voice-cloning/clone' });
        
        // Em vez de mockar sucesso, retornamos erro real de dependência (ou Service Unavailable)
        // Isso força a configuração correta para funcionar em produção
        return NextResponse.json(
            { 
              error: 'Serviço de clonagem de voz não configurado (API Key ausente).',
              code: 'MISSING_PROVIDER_CONFIG' 
            },
            { status: 503 } // Service Unavailable
        );
    }

    // Integração Real com ElevenLabs
    try {
        const service = ElevenLabsService.getInstance();
        const cloneResponse = await service.cloneVoice(name, description || '', files);

        // Salvar metadados no banco local
        // Nota: sample_audio_url deveria ser o link do arquivo no storage, mas como o upload
        // foi direto para a ElevenLabs via form-data neste fluxo simplificado, 
        // vamos usar um placeholder ou tentar salvar no storage primeiro em uma iteração futura.
        // Por hora, mantemos a consistência com o banco.
        
        // Tenta buscar usuário atual se houver auth (aqui assumindo sistema sem auth no request por enquanto ou mock user)
        // Em produção real, pegariamos session.user.id
        
        const voiceProfile = await (prisma as any).voice_profiles.create({
            data: {
                name: cloneResponse.voice_id ? name : `Clone - ${name}`, // Fallback name logic
                display_name: name,
                description: `${description} [ElevenLabs ID: ${cloneResponse.voice_id}]`,
                language: 'pt_BR', // Default
                gender: 'neutral', // Default enum lowercase
                sample_audio_url: 'https://api.elevenlabs.io/v1/voices/' + cloneResponse.voice_id, // Link para API como ref
                training_data_url: cloneResponse.voice_id, // Store ElevenLabs voice_id here
            }
        }).catch((err: unknown) => {
            logger.error('Erro ao salvar voice_profile no banco local', err);
            // Não falha a requisição se salvou na ElevenLabs
        });

        return NextResponse.json({
            success: true,
            voice_id: cloneResponse.voice_id,
            name,
            status: 'ready', // ElevenLabs Instant Cloning is usually ready immediately
            provider_response: cloneResponse
        });

    } catch (apiError) {
        logger.error('Erro na API ElevenLabs', apiError as Error);
        return NextResponse.json(
            { error: 'Falha na comunicação com serviço de clonagem: ' + (apiError as Error).message },
            { status: 502 }
        );
    }

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Voice cloning error', errorObj, { component: 'API: /api/voice-cloning/clone' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'voice-cloning-clone-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

  // Retorna capabilities reais
  return NextResponse.json({
    provider: 'ElevenLabs',
    version: 'v1',
    supported_formats: ['wav', 'mp3', 'm4a'],
    max_files: 25,
    max_file_size: '10MB'
  })
}
