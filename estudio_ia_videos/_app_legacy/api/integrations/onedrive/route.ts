/**
 * ☁️ OneDrive API Routes
 * 
 * Endpoints:
 * - GET /api/integrations/onedrive - Status e documentação
 * - GET /api/integrations/onedrive?action=auth - Inicia OAuth
 * - GET /api/integrations/onedrive?action=callback - Callback OAuth
 * - GET /api/integrations/onedrive?action=list - Lista arquivos
 * - GET /api/integrations/onedrive?action=presentations - Lista apresentações
 * - POST /api/integrations/onedrive - Download/Import de arquivo
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

// =============================================================================
// Types
// =============================================================================

interface MicrosoftTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  tokenType: string;
}

interface OneDriveItem {
  id: string;
  name: string;
  size?: number;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  webUrl?: string;
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
  thumbnails?: Array<{
    id: string;
    medium?: { url: string };
  }>;
  '@microsoft.graph.downloadUrl'?: string;
}

// =============================================================================
// Constants
// =============================================================================

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com';
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

const SCOPES = [
  'Files.Read',
  'Files.Read.All',
  'offline_access',
  'User.Read',
].join(' ');

const PPTX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

const PPTX_EXTENSIONS = ['.pptx', '.ppt'];

// =============================================================================
// Helper Functions
// =============================================================================

function getConfig() {
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || '',
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  };
}

function isConfigured(): boolean {
  const config = getConfig();
  return !!(config.clientId && config.clientSecret && config.redirectUri);
}

async function getStoredTokens(): Promise<MicrosoftTokens | null> {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('onedrive_tokens');
  
  if (!tokensCookie) return null;
  
  try {
    return JSON.parse(tokensCookie.value);
  } catch {
    return null;
  }
}

async function storeTokens(tokens: MicrosoftTokens): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('onedrive_tokens', JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

async function clearTokens(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('onedrive_tokens');
}

async function refreshTokens(refreshToken: string): Promise<MicrosoftTokens> {
  const config = getConfig();
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(
    `${MICROSOFT_AUTH_URL}/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    throw new Error('Falha ao atualizar tokens');
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    tokenType: data.token_type,
  };
}

async function getValidAccessToken(): Promise<string> {
  let tokens = await getStoredTokens();
  
  if (!tokens) {
    throw new Error('Não autenticado');
  }

  if (new Date(tokens.expiresAt) <= new Date()) {
    if (!tokens.refreshToken) {
      throw new Error('Token expirado e sem refresh token');
    }
    
    tokens = await refreshTokens(tokens.refreshToken);
    await storeTokens(tokens);
  }

  return tokens.accessToken;
}

async function fetchGraph<T>(endpoint: string, accessToken: string): Promise<T> {
  const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro na API do Graph: ${error}`);
  }

  return response.json();
}

function isPresentationFile(item: OneDriveItem): boolean {
  if (!item.file) return false;
  
  const mimeType = item.file.mimeType;
  const name = item.name.toLowerCase();
  
  return PPTX_MIME_TYPES.includes(mimeType) || 
         PPTX_EXTENSIONS.some((ext: string) => name.endsWith(ext));
}

// =============================================================================
// Schemas
// =============================================================================

const downloadSchema = z.object({
  action: z.literal('download'),
  itemId: z.string(),
});

const importSchema = z.object({
  action: z.literal('import'),
  itemId: z.string(),
  projectId: z.string().uuid().optional(),
});

const postSchema = z.union([downloadSchema, importSchema]);

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!isConfigured()) {
    return NextResponse.json({
      configured: false,
      error: 'OneDrive não configurado',
      requiredEnvVars: [
        'MICROSOFT_CLIENT_ID',
        'MICROSOFT_CLIENT_SECRET',
        'MICROSOFT_REDIRECT_URI',
      ],
    }, { status: 503 });
  }

  const config = getConfig();

  // === Action: Auth ===
  if (action === 'auth') {
    const state = searchParams.get('state') || 'default';
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: SCOPES,
      response_mode: 'query',
      state,
    });

    const authUrl = `${MICROSOFT_AUTH_URL}/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
    
    return NextResponse.json({
      authUrl,
      message: 'Redirecione o usuário para a URL de autorização',
    });
  }

  // === Action: Callback ===
  if (action === 'callback') {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json(
        { error: `Autorização negada: ${error}` },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Código de autorização não fornecido' },
        { status: 400 }
      );
    }

    try {
      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code,
      });

      const response = await fetch(
        `${MICROSOFT_AUTH_URL}/${config.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao obter tokens');
      }

      const data = await response.json();

      const tokens: MicrosoftTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        tokenType: data.token_type,
      };

      await storeTokens(tokens);

      return NextResponse.json({
        success: true,
        message: 'Autenticação concluída com sucesso',
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Erro desconhecido' },
        { status: 500 }
      );
    }
  }

  // === Action: Status ===
  if (action === 'status') {
    const tokens = await getStoredTokens();
    
    if (!tokens) {
      return NextResponse.json({ authenticated: false });
    }

    const isExpired = new Date(tokens.expiresAt) <= new Date();
    const canRefresh = !!tokens.refreshToken;

    return NextResponse.json({
      authenticated: !isExpired || canRefresh,
      expiresAt: tokens.expiresAt,
      canRefresh,
    });
  }

  // === Action: List ===
  if (action === 'list') {
    try {
      const accessToken = await getValidAccessToken();
      
      const folderId = searchParams.get('folderId') || 'root';
      const query = searchParams.get('query') || '';
      const pageSize = searchParams.get('pageSize') || '50';
      const skipToken = searchParams.get('skipToken') || '';

      let endpoint: string;
      
      if (query) {
        endpoint = `/me/drive/root/search(q='${encodeURIComponent(query)}')`;
      } else if (folderId !== 'root') {
        endpoint = `/me/drive/items/${folderId}/children`;
      } else {
        endpoint = '/me/drive/root/children';
      }

      const params = new URLSearchParams({
        '$top': pageSize,
        '$orderby': 'name',
        '$select': 'id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder',
        '$expand': 'thumbnails',
      });

      if (skipToken) {
        params.set('$skiptoken', skipToken);
      }

      const result = await fetchGraph<{
        value: OneDriveItem[];
        '@odata.nextLink'?: string;
      }>(`${endpoint}?${params.toString()}`, accessToken);

      // Extract skipToken from nextLink
      let nextSkipToken: string | undefined;
      if (result['@odata.nextLink']) {
        const url = new URL(result['@odata.nextLink']);
        nextSkipToken = url.searchParams.get('$skiptoken') || undefined;
      }

      const folders = result.value.filter((item: OneDriveItem) => item.folder);
      const files = result.value.filter((item: OneDriveItem) => item.file);

      return NextResponse.json({
        folderId,
        folders,
        files,
        total: result.value.length,
        skipToken: nextSkipToken,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Erro desconhecido' },
        { status: err instanceof Error && err.message === 'Não autenticado' ? 401 : 500 }
      );
    }
  }

  // === Action: Presentations ===
  if (action === 'presentations') {
    try {
      const accessToken = await getValidAccessToken();
      
      const query = searchParams.get('query') || '';
      const pageSize = searchParams.get('pageSize') || '50';
      const skipToken = searchParams.get('skipToken') || '';

      // Search for PowerPoint files
      const searchQuery = query || PPTX_EXTENSIONS.join(' OR ');
      const endpoint = `/me/drive/root/search(q='${encodeURIComponent(searchQuery)}')`;

      const params = new URLSearchParams({
        '$top': pageSize,
        '$orderby': 'lastModifiedDateTime desc',
        '$select': 'id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file',
        '$expand': 'thumbnails',
      });

      if (skipToken) {
        params.set('$skiptoken', skipToken);
      }

      const result = await fetchGraph<{
        value: OneDriveItem[];
        '@odata.nextLink'?: string;
      }>(`${endpoint}?${params.toString()}`, accessToken);

      // Filter to only PowerPoint files
      const presentations = result.value.filter(isPresentationFile);

      let nextSkipToken: string | undefined;
      if (result['@odata.nextLink']) {
        const url = new URL(result['@odata.nextLink']);
        nextSkipToken = url.searchParams.get('$skiptoken') || undefined;
      }

      return NextResponse.json({
        presentations,
        total: presentations.length,
        skipToken: nextSkipToken,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Erro desconhecido' },
        { status: err instanceof Error && err.message === 'Não autenticado' ? 401 : 500 }
      );
    }
  }

  // === Action: Logout ===
  if (action === 'logout') {
    await clearTokens();
    
    return NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  }

  // === Default: Documentation ===
  return NextResponse.json({
    name: 'OneDrive Integration API',
    version: '1.0.0',
    configured: true,
    endpoints: {
      'GET ?action=auth': 'Inicia fluxo OAuth',
      'GET ?action=callback&code=xxx': 'Callback do OAuth',
      'GET ?action=status': 'Verifica status da autenticação',
      'GET ?action=list&folderId=xxx': 'Lista arquivos de uma pasta',
      'GET ?action=presentations': 'Lista todas as apresentações',
      'GET ?action=logout': 'Remove autenticação',
      'POST action=download': 'Baixa um arquivo',
      'POST action=import': 'Importa PPTX para o projeto',
    },
    supportedFormats: PPTX_MIME_TYPES,
  });
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'OneDrive não configurado' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken();
    const data = parsed.data;

    // Get item details with download URL
    const itemParams = new URLSearchParams({
      '$select': 'id,name,size,file,@microsoft.graph.downloadUrl',
    });
    
    const item = await fetchGraph<OneDriveItem>(
      `/me/drive/items/${data.itemId}?${itemParams.toString()}`,
      accessToken
    );

    if (!item.file) {
      return NextResponse.json(
        { error: 'Item não é um arquivo' },
        { status: 400 }
      );
    }

    // === Action: Download ===
    if (data.action === 'download') {
      const downloadUrl = item['@microsoft.graph.downloadUrl'];
      if (!downloadUrl) {
        return NextResponse.json(
          { error: 'URL de download não disponível' },
          { status: 400 }
        );
      }

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo');
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      return NextResponse.json({
        success: true,
        file: {
          id: item.id,
          name: item.name,
          mimeType: item.file.mimeType,
          size: arrayBuffer.byteLength,
        },
        data: base64,
        encoding: 'base64',
      });
    }

    // === Action: Import ===
    if (data.action === 'import') {
      if (!isPresentationFile(item)) {
        return NextResponse.json(
          { error: 'Arquivo não é uma apresentação válida' },
          { status: 400 }
        );
      }

      const downloadUrl = item['@microsoft.graph.downloadUrl'];
      if (!downloadUrl) {
        return NextResponse.json(
          { error: 'URL de download não disponível' },
          { status: 400 }
        );
      }

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo');
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      return NextResponse.json({
        success: true,
        imported: true,
        file: {
          id: item.id,
          name: item.name,
          mimeType: item.file.mimeType,
          size: arrayBuffer.byteLength,
        },
        data: base64,
        encoding: 'base64',
        nextStep: 'Envie os dados para /api/pptx/upload para processar o PPTX',
      });
    }

    return NextResponse.json(
      { error: 'Ação não reconhecida' },
      { status: 400 }
    );

  } catch (err) {
    console.error('[onedrive-api] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: err instanceof Error && err.message === 'Não autenticado' ? 401 : 500 }
    );
  }
}
