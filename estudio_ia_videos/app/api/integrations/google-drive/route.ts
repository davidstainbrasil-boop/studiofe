/**
 * ☁️ Google Drive API Routes
 * 
 * Endpoints:
 * - GET /api/integrations/google-drive - Status e documentação
 * - GET /api/integrations/google-drive?action=auth - Inicia OAuth
 * - GET /api/integrations/google-drive?action=callback - Callback OAuth
 * - GET /api/integrations/google-drive?action=list - Lista arquivos
 * - GET /api/integrations/google-drive?action=presentations - Lista apresentações
 * - POST /api/integrations/google-drive - Download/Import de arquivo
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

// =============================================================================
// Types
// =============================================================================

interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  tokenType: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
}

// =============================================================================
// Constants
// =============================================================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

const PPTX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.google-apps.presentation',
];

const EXPORT_FORMATS: Record<string, string> = {
  'application/vnd.google-apps.presentation':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

// =============================================================================
// Helper Functions
// =============================================================================

function getConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  };
}

function isConfigured(): boolean {
  const config = getConfig();
  return !!(config.clientId && config.clientSecret && config.redirectUri);
}

async function getStoredTokens(): Promise<GoogleTokens | null> {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_drive_tokens');
  
  if (!tokensCookie) return null;
  
  try {
    return JSON.parse(tokensCookie.value);
  } catch {
    return null;
  }
}

async function storeTokens(tokens: GoogleTokens): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('google_drive_tokens', JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

async function clearTokens(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('google_drive_tokens');
}

async function refreshTokens(refreshToken: string): Promise<GoogleTokens> {
  const config = getConfig();
  
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Falha ao atualizar tokens');
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    tokenType: data.token_type,
  };
}

async function getValidAccessToken(): Promise<string> {
  let tokens = await getStoredTokens();
  
  if (!tokens) {
    throw new Error('Não autenticado');
  }

  // Check if token is expired
  if (new Date(tokens.expiresAt) <= new Date()) {
    if (!tokens.refreshToken) {
      throw new Error('Token expirado e sem refresh token');
    }
    
    tokens = await refreshTokens(tokens.refreshToken);
    await storeTokens(tokens);
  }

  return tokens.accessToken;
}

async function fetchDrive<T>(endpoint: string, accessToken: string): Promise<T> {
  const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro na API do Drive: ${error}`);
  }

  return response.json();
}

// =============================================================================
// Schemas
// =============================================================================

const downloadSchema = z.object({
  action: z.literal('download'),
  fileId: z.string(),
  exportFormat: z.string().optional(),
});

const importSchema = z.object({
  action: z.literal('import'),
  fileId: z.string(),
  projectId: z.string().uuid().optional(),
});

const postSchema = z.union([downloadSchema, importSchema]);

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Check configuration
  if (!isConfigured()) {
    return NextResponse.json({
      configured: false,
      error: 'Google Drive não configurado',
      requiredEnvVars: [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REDIRECT_URI',
      ],
    }, { status: 503 });
  }

  const config = getConfig();

  // === Action: Auth - Start OAuth flow ===
  if (action === 'auth') {
    const state = searchParams.get('state') || 'default';
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    
    return NextResponse.json({
      authUrl,
      message: 'Redirecione o usuário para a URL de autorização',
    });
  }

  // === Action: Callback - Handle OAuth callback ===
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
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error('Falha ao obter tokens');
      }

      const data = await response.json();

      const tokens: GoogleTokens = {
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

  // === Action: Status - Check authentication status ===
  if (action === 'status') {
    const tokens = await getStoredTokens();
    
    if (!tokens) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    const isExpired = new Date(tokens.expiresAt) <= new Date();
    const canRefresh = !!tokens.refreshToken;

    return NextResponse.json({
      authenticated: !isExpired || canRefresh,
      expiresAt: tokens.expiresAt,
      canRefresh,
    });
  }

  // === Action: List - List files in folder ===
  if (action === 'list') {
    try {
      const accessToken = await getValidAccessToken();
      
      const folderId = searchParams.get('folderId') || 'root';
      const query = searchParams.get('query') || '';
      const pageSize = searchParams.get('pageSize') || '50';
      const pageToken = searchParams.get('pageToken') || '';

      const queryParts = [
        `'${folderId}' in parents`,
        'trashed = false',
      ];

      if (query) {
        queryParts.push(`name contains '${query}'`);
      }

      const params = new URLSearchParams({
        q: queryParts.join(' and '),
        pageSize,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink, iconLink)',
        orderBy: 'folder, name',
        ...(pageToken && { pageToken }),
      });

      const result = await fetchDrive<{
        files: DriveFile[];
        nextPageToken?: string;
      }>(`/files?${params.toString()}`, accessToken);

      // Separate folders and files
      const folders = result.files.filter((f: DriveFile) => 
        f.mimeType === 'application/vnd.google-apps.folder'
      );
      const files = result.files.filter((f: DriveFile) => 
        f.mimeType !== 'application/vnd.google-apps.folder'
      );

      return NextResponse.json({
        folderId,
        folders,
        files,
        total: result.files.length,
        nextPageToken: result.nextPageToken,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Erro desconhecido' },
        { status: err instanceof Error && err.message === 'Não autenticado' ? 401 : 500 }
      );
    }
  }

  // === Action: Presentations - List only presentations ===
  if (action === 'presentations') {
    try {
      const accessToken = await getValidAccessToken();
      
      const query = searchParams.get('query') || '';
      const pageSize = searchParams.get('pageSize') || '50';
      const pageToken = searchParams.get('pageToken') || '';

      const mimeTypeQuery = PPTX_MIME_TYPES.map(t => `mimeType = '${t}'`).join(' or ');

      const queryParts = [
        `(${mimeTypeQuery})`,
        'trashed = false',
      ];

      if (query) {
        queryParts.push(`name contains '${query}'`);
      }

      const params = new URLSearchParams({
        q: queryParts.join(' and '),
        pageSize,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink, iconLink)',
        orderBy: 'modifiedTime desc',
        ...(pageToken && { pageToken }),
      });

      const result = await fetchDrive<{
        files: DriveFile[];
        nextPageToken?: string;
      }>(`/files?${params.toString()}`, accessToken);

      return NextResponse.json({
        presentations: result.files,
        total: result.files.length,
        nextPageToken: result.nextPageToken,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Erro desconhecido' },
        { status: err instanceof Error && err.message === 'Não autenticado' ? 401 : 500 }
      );
    }
  }

  // === Action: Logout - Clear tokens ===
  if (action === 'logout') {
    await clearTokens();
    
    return NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  }

  // === Default: API Documentation ===
  return NextResponse.json({
    name: 'Google Drive Integration API',
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
      { error: 'Google Drive não configurado' },
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

    // === Action: Download ===
    if (data.action === 'download') {
      // Get file metadata
      const fileParams = new URLSearchParams({
        fields: 'id, name, mimeType, size',
      });
      
      const file = await fetchDrive<DriveFile>(
        `/files/${data.fileId}?${fileParams.toString()}`,
        accessToken
      );

      let downloadUrl: string;
      let targetMimeType = file.mimeType;

      // Handle Google Slides export
      if (file.mimeType.startsWith('application/vnd.google-apps.')) {
        targetMimeType = data.exportFormat || EXPORT_FORMATS[file.mimeType];
        
        if (!targetMimeType) {
          return NextResponse.json(
            { error: 'Formato de exportação não suportado' },
            { status: 400 }
          );
        }

        downloadUrl = `${DRIVE_API_BASE}/files/${data.fileId}/export?mimeType=${encodeURIComponent(targetMimeType)}`;
      } else {
        downloadUrl = `${DRIVE_API_BASE}/files/${data.fileId}?alt=media`;
      }

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo');
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Determine filename
      let filename = file.name;
      if (file.mimeType.startsWith('application/vnd.google-apps.presentation')) {
        filename = filename.endsWith('.pptx') ? filename : `${filename}.pptx`;
      }

      return NextResponse.json({
        success: true,
        file: {
          id: file.id,
          name: filename,
          mimeType: targetMimeType,
          size: arrayBuffer.byteLength,
        },
        data: base64,
        encoding: 'base64',
      });
    }

    // === Action: Import ===
    if (data.action === 'import') {
      // Get file metadata
      const fileParams = new URLSearchParams({
        fields: 'id, name, mimeType, size',
      });
      
      const file = await fetchDrive<DriveFile>(
        `/files/${data.fileId}?${fileParams.toString()}`,
        accessToken
      );

      // Verify it's a presentation
      if (!PPTX_MIME_TYPES.includes(file.mimeType)) {
        return NextResponse.json(
          { error: 'Arquivo não é uma apresentação válida' },
          { status: 400 }
        );
      }

      // Determine export format and download URL
      let downloadUrl: string;
      const targetMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      if (file.mimeType === 'application/vnd.google-apps.presentation') {
        downloadUrl = `${DRIVE_API_BASE}/files/${data.fileId}/export?mimeType=${encodeURIComponent(targetMimeType)}`;
      } else {
        downloadUrl = `${DRIVE_API_BASE}/files/${data.fileId}?alt=media`;
      }

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo');
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      let filename = file.name;
      if (!filename.endsWith('.pptx')) {
        filename = `${filename}.pptx`;
      }

      return NextResponse.json({
        success: true,
        imported: true,
        file: {
          id: file.id,
          name: filename,
          originalName: file.name,
          mimeType: targetMimeType,
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
    console.error('[google-drive-api] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: err instanceof Error && err.message === 'Não autenticado' ? 401 : 500 }
    );
  }
}
