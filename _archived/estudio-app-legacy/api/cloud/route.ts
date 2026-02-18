/**
 * API Route: Cloud Storage
 * Integração com Google Drive e OneDrive
 * 
 * @route GET /api/cloud - Lista arquivos/conexões
 * @route POST /api/cloud - OAuth e importação
 * @route DELETE /api/cloud - Desconectar provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getCloudStorageService,
  CloudProvider,
} from '@/src/lib/cloud/cloud-storage-service';

// ============================================================================
// SCHEMAS
// ============================================================================

const authUrlSchema = z.object({
  action: z.literal('get-auth-url'),
  provider: z.enum(['google-drive', 'onedrive']),
  redirectUri: z.string().url(),
  state: z.string().optional(),
});

const exchangeCodeSchema = z.object({
  action: z.literal('exchange-code'),
  provider: z.enum(['google-drive', 'onedrive']),
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

const refreshTokenSchema = z.object({
  action: z.literal('refresh-token'),
  provider: z.enum(['google-drive', 'onedrive']),
  refreshToken: z.string().min(1),
});

const listFilesSchema = z.object({
  action: z.literal('list-files'),
  provider: z.enum(['google-drive', 'onedrive']),
  accessToken: z.string().min(1),
  folderId: z.string().optional(),
  pageToken: z.string().optional(),
  presentationsOnly: z.boolean().optional(),
});

const importFileSchema = z.object({
  action: z.literal('import-file'),
  provider: z.enum(['google-drive', 'onedrive']),
  accessToken: z.string().min(1),
  fileId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

const getUserSchema = z.object({
  action: z.literal('get-user'),
  provider: z.enum(['google-drive', 'onedrive']),
  accessToken: z.string().min(1),
});

const saveConnectionSchema = z.object({
  action: z.literal('save-connection'),
  userId: z.string().min(1),
  provider: z.enum(['google-drive', 'onedrive']),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string(), // ISO date string
});

// ============================================================================
// ENVIRONMENT
// ============================================================================

function getProviderConfig(provider: CloudProvider) {
  if (provider === 'google-drive') {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    };
  }
  
  if (provider === 'onedrive') {
    return {
      clientId: process.env.ONEDRIVE_CLIENT_ID || '',
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET || '',
    };
  }

  throw new Error(`Provider não suportado: ${provider}`);
}

// ============================================================================
// GET - Listar arquivos e conexões
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = getCloudStorageService();

    // Verificar status de importação
    const importId = searchParams.get('importId');
    if (importId) {
      const status = service.getImportStatus(importId);
      if (!status) {
        return NextResponse.json(
          { error: 'Importação não encontrada' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        import: status,
      });
    }

    // Listar conexões do usuário
    const userId = searchParams.get('userId');
    if (userId) {
      const connections = service.listConnections(userId);
      return NextResponse.json({
        success: true,
        connections: connections.map(c => ({
          provider: c.provider,
          user: c.user,
          isActive: c.isActive,
          connectedAt: c.connectedAt,
          tokenExpired: service.isTokenExpired(c.tokens),
        })),
      });
    }

    // Documentação
    return NextResponse.json({
      success: true,
      providers: ['google-drive', 'onedrive'],
      endpoints: {
        'GET /api/cloud?userId=xxx': 'Lista conexões do usuário',
        'GET /api/cloud?importId=xxx': 'Status de importação',
        'POST (action=get-auth-url)': 'Gera URL de autorização OAuth',
        'POST (action=exchange-code)': 'Troca código por tokens',
        'POST (action=refresh-token)': 'Renova tokens',
        'POST (action=get-user)': 'Obtém info do usuário',
        'POST (action=list-files)': 'Lista arquivos',
        'POST (action=import-file)': 'Importa arquivo',
        'POST (action=save-connection)': 'Salva conexão',
        'DELETE': 'Remove conexão',
      },
      requiredEnv: {
        'google-drive': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
        'onedrive': ['ONEDRIVE_CLIENT_ID', 'ONEDRIVE_CLIENT_SECRET'],
      },
    });
  } catch (error) {
    console.error('[API Cloud GET] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - OAuth e importação
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const service = getCloudStorageService();

    // Gerar URL de autorização
    if (body.action === 'get-auth-url') {
      const parsed = authUrlSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { provider, redirectUri, state } = parsed.data;
      const { clientId } = getProviderConfig(provider);

      if (!clientId) {
        return NextResponse.json(
          { error: `Configuração do ${provider} não encontrada` },
          { status: 500 }
        );
      }

      let authUrl: string;

      if (provider === 'google-drive') {
        authUrl = service.getGoogleAuthUrl(clientId, redirectUri, state);
      } else {
        authUrl = service.getOneDriveAuthUrl(clientId, redirectUri, state);
      }

      return NextResponse.json({
        success: true,
        authUrl,
        provider,
      });
    }

    // Trocar código por tokens
    if (body.action === 'exchange-code') {
      const parsed = exchangeCodeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { provider, code, redirectUri } = parsed.data;
      const { clientId, clientSecret } = getProviderConfig(provider);

      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: `Configuração do ${provider} não encontrada` },
          { status: 500 }
        );
      }

      try {
        let tokens;
        let user;

        if (provider === 'google-drive') {
          tokens = await service.exchangeGoogleCode(code, clientId, clientSecret, redirectUri);
          user = await service.getGoogleUser(tokens.accessToken);
        } else {
          tokens = await service.exchangeOneDriveCode(code, clientId, clientSecret, redirectUri);
          user = await service.getOneDriveUser(tokens.accessToken);
        }

        return NextResponse.json({
          success: true,
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt.toISOString(),
          },
          user,
        });
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Falha na autenticação' },
          { status: 401 }
        );
      }
    }

    // Renovar tokens
    if (body.action === 'refresh-token') {
      const parsed = refreshTokenSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { provider, refreshToken } = parsed.data;
      const { clientId, clientSecret } = getProviderConfig(provider);

      try {
        let tokens;

        if (provider === 'google-drive') {
          tokens = await service.refreshGoogleTokens(refreshToken, clientId, clientSecret);
        } else {
          tokens = await service.refreshOneDriveTokens(refreshToken, clientId, clientSecret);
        }

        return NextResponse.json({
          success: true,
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt.toISOString(),
          },
        });
      } catch (err) {
        return NextResponse.json(
          { error: 'Falha ao renovar tokens' },
          { status: 401 }
        );
      }
    }

    // Obter usuário
    if (body.action === 'get-user') {
      const parsed = getUserSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { provider, accessToken } = parsed.data;

      try {
        let user;

        if (provider === 'google-drive') {
          user = await service.getGoogleUser(accessToken);
        } else {
          user = await service.getOneDriveUser(accessToken);
        }

        return NextResponse.json({
          success: true,
          user,
        });
      } catch (err) {
        return NextResponse.json(
          { error: 'Falha ao obter usuário' },
          { status: 401 }
        );
      }
    }

    // Listar arquivos
    if (body.action === 'list-files') {
      const parsed = listFilesSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { provider, accessToken, folderId, pageToken, presentationsOnly } = parsed.data;

      try {
        let result;

        if (provider === 'google-drive') {
          result = presentationsOnly
            ? await service.listGoogleDrivePresentations(accessToken, pageToken)
            : await service.listGoogleDriveFiles(accessToken, folderId, pageToken);
        } else {
          result = presentationsOnly
            ? await service.listOneDrivePresentations(accessToken, pageToken)
            : await service.listOneDriveFiles(accessToken, folderId, pageToken);
        }

        return NextResponse.json({
          success: true,
          files: result.files,
          nextPageToken: result.nextPageToken,
          total: result.files.length,
        });
      } catch (err) {
        return NextResponse.json(
          { error: 'Falha ao listar arquivos' },
          { status: 500 }
        );
      }
    }

    // Importar arquivo
    if (body.action === 'import-file') {
      const parsed = importFileSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { provider, accessToken, fileId, fileName, mimeType } = parsed.data;

      // Verifica se é um arquivo de apresentação
      if (!service.isPresentationFile(mimeType, fileName)) {
        return NextResponse.json(
          { error: 'Apenas arquivos PPTX são suportados' },
          { status: 400 }
        );
      }

      const result = await service.importFile(
        accessToken,
        provider,
        fileId,
        fileName,
        mimeType
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        import: result,
      });
    }

    // Salvar conexão
    if (body.action === 'save-connection') {
      const parsed = saveConnectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { userId, provider, accessToken, refreshToken, expiresAt } = parsed.data;

      try {
        // Obtém info do usuário
        let user;
        if (provider === 'google-drive') {
          user = await service.getGoogleUser(accessToken);
        } else {
          user = await service.getOneDriveUser(accessToken);
        }

        // Salva conexão
        service.saveConnection(userId, {
          provider,
          user,
          tokens: {
            accessToken,
            refreshToken,
            expiresAt: new Date(expiresAt),
            tokenType: 'Bearer',
          },
          isActive: true,
          connectedAt: new Date(),
        });

        return NextResponse.json({
          success: true,
          message: 'Conexão salva com sucesso',
          user,
        });
      } catch (err) {
        return NextResponse.json(
          { error: 'Falha ao salvar conexão' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Ação não especificada ou inválida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API Cloud POST] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Remover conexão
// ============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const provider = searchParams.get('provider') as CloudProvider | null;

    if (!userId || !provider) {
      return NextResponse.json(
        { error: 'userId e provider são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['google-drive', 'onedrive'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider inválido' },
        { status: 400 }
      );
    }

    const service = getCloudStorageService();
    service.removeConnection(userId, provider);

    return NextResponse.json({
      success: true,
      message: 'Conexão removida com sucesso',
    });
  } catch (error) {
    console.error('[API Cloud DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
