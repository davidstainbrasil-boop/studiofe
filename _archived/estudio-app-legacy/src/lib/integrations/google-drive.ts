/**
 * ☁️ Google Drive Integration
 * 
 * Integração com Google Drive para:
 * - Import de arquivos PPTX diretamente
 * - Navegação de pastas
 * - Download seguro de arquivos
 * 
 * Requer configuração de OAuth2:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 */

// Simple logger for this module
const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(`[google-drive] ${message}`, context || '');
  },
  warn: (message: string, error?: Error) => {
    console.warn(`[google-drive] ${message}`, error?.message || '');
  },
  error: (message: string, error?: Error) => {
    console.error(`[google-drive] ${message}`, error?.message || '');
  },
};

// =============================================================================
// Types
// =============================================================================

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  shared?: boolean;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  }>;
}

export interface DriveFolder {
  id: string;
  name: string;
  files: DriveFile[];
  subfolders: DriveFolder[];
  path: string;
}

export interface DriveListOptions {
  folderId?: string;
  query?: string;
  mimeType?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: 'name' | 'modifiedTime' | 'createdTime' | 'folder';
  includeItemsFromAllDrives?: boolean;
}

export interface DriveListResult {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

export interface DriveDownloadOptions {
  fileId: string;
  exportFormat?: string;
}

export interface DriveDownloadResult {
  data: Buffer;
  mimeType: string;
  filename: string;
  size: number;
}

// =============================================================================
// Constants
// =============================================================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

const PPTX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.google-apps.presentation',
];

const EXPORT_FORMATS: Record<string, string> = {
  'application/vnd.google-apps.presentation': 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.google-apps.document':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.spreadsheet':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// =============================================================================
// GoogleDriveClient Class
// =============================================================================

export class GoogleDriveClient {
  private config: GoogleAuthConfig;
  private tokens: GoogleTokens | null = null;

  constructor(config?: Partial<GoogleAuthConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || process.env.GOOGLE_REDIRECT_URI || '',
      scopes: config?.scopes || DEFAULT_SCOPES,
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      logger.warn('Google Drive credentials not configured');
    }
  }

  /**
   * Gera URL de autorização OAuth2
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state }),
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Troca código de autorização por tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    const params = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to exchange code for tokens', new Error(error));
      throw new Error('Falha ao obter tokens de acesso');
    }

    const data = await response.json();

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };

    logger.info('Tokens obtained successfully');
    return this.tokens;
  }

  /**
   * Atualiza tokens usando refresh token
   */
  async refreshTokens(): Promise<GoogleTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('Refresh token não disponível');
    }

    const params = new URLSearchParams({
      refresh_token: this.tokens.refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to refresh tokens', new Error(error));
      throw new Error('Falha ao atualizar tokens');
    }

    const data = await response.json();

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: this.tokens.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };

    logger.info('Tokens refreshed successfully');
    return this.tokens;
  }

  /**
   * Define tokens manualmente (ex: vindos do banco de dados)
   */
  setTokens(tokens: GoogleTokens): void {
    this.tokens = tokens;
  }

  /**
   * Verifica se os tokens são válidos
   */
  isAuthenticated(): boolean {
    if (!this.tokens) return false;
    return this.tokens.expiresAt > new Date();
  }

  /**
   * Garante que temos um token válido
   */
  private async ensureValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Não autenticado. Execute o fluxo OAuth primeiro.');
    }

    if (this.tokens.expiresAt <= new Date()) {
      await this.refreshTokens();
    }

    return this.tokens.accessToken;
  }

  /**
   * Faz requisição autenticada à API do Drive
   */
  private async fetchDrive<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureValidToken();

    const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Drive API error: ${endpoint}`, new Error(error));
      throw new Error(`Erro na API do Drive: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Lista arquivos e pastas
   */
  async listFiles(options: DriveListOptions = {}): Promise<DriveListResult> {
    const {
      folderId = 'root',
      query,
      mimeType,
      pageSize = 50,
      pageToken,
      orderBy = 'folder',
      includeItemsFromAllDrives = false,
    } = options;

    // Construir query
    const queryParts: string[] = [];
    
    if (folderId) {
      queryParts.push(`'${folderId}' in parents`);
    }
    
    queryParts.push('trashed = false');
    
    if (query) {
      queryParts.push(`name contains '${query}'`);
    }
    
    if (mimeType) {
      queryParts.push(`mimeType = '${mimeType}'`);
    }

    const params = new URLSearchParams({
      q: queryParts.join(' and '),
      pageSize: pageSize.toString(),
      fields: 'nextPageToken, incompleteSearch, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink, iconLink, parents, shared, owners)',
      orderBy: orderBy === 'folder' ? 'folder, name' : orderBy,
      supportsAllDrives: includeItemsFromAllDrives.toString(),
      includeItemsFromAllDrives: includeItemsFromAllDrives.toString(),
      ...(pageToken && { pageToken }),
    });

    const result = await this.fetchDrive<{
      files: DriveFile[];
      nextPageToken?: string;
      incompleteSearch?: boolean;
    }>(`/files?${params.toString()}`);

    logger.info('Files listed', { 
      folderId, 
      count: result.files.length,
      hasMore: !!result.nextPageToken,
    });

    return result;
  }

  /**
   * Lista apenas apresentações (PPTX e Google Slides)
   */
  async listPresentations(options: Omit<DriveListOptions, 'mimeType'> = {}): Promise<DriveListResult> {
    const queryParts = PPTX_MIME_TYPES.map(type => `mimeType = '${type}'`);
    const mimeTypeQuery = `(${queryParts.join(' or ')})`;

    const {
      folderId = 'root',
      query,
      pageSize = 50,
      pageToken,
      orderBy = 'modifiedTime',
    } = options;

    const baseQuery = [
      `'${folderId}' in parents`,
      'trashed = false',
      mimeTypeQuery,
    ];

    if (query) {
      baseQuery.push(`name contains '${query}'`);
    }

    const params = new URLSearchParams({
      q: baseQuery.join(' and '),
      pageSize: pageSize.toString(),
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink, iconLink, owners)',
      orderBy: orderBy === 'folder' ? 'modifiedTime desc' : `${orderBy} desc`,
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const result = await this.fetchDrive<{
      files: DriveFile[];
      nextPageToken?: string;
    }>(`/files?${params.toString()}`);

    logger.info('Presentations listed', { count: result.files.length });

    return result;
  }

  /**
   * Obtém detalhes de um arquivo
   */
  async getFile(fileId: string): Promise<DriveFile> {
    const params = new URLSearchParams({
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink, iconLink, parents, shared, owners',
    });

    return this.fetchDrive<DriveFile>(`/files/${fileId}?${params.toString()}`);
  }

  /**
   * Baixa um arquivo
   */
  async downloadFile(options: DriveDownloadOptions): Promise<DriveDownloadResult> {
    const { fileId, exportFormat } = options;
    const token = await this.ensureValidToken();

    // Primeiro, obter metadados do arquivo
    const file = await this.getFile(fileId);
    
    let downloadUrl: string;
    let targetMimeType = file.mimeType;

    // Se for um arquivo do Google (Slides, Docs, etc), precisa exportar
    if (file.mimeType.startsWith('application/vnd.google-apps.')) {
      targetMimeType = exportFormat || EXPORT_FORMATS[file.mimeType];
      
      if (!targetMimeType) {
        throw new Error(`Formato de exportação não suportado para ${file.mimeType}`);
      }

      downloadUrl = `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(targetMimeType)}`;
    } else {
      downloadUrl = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
    }

    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to download file', new Error(error));
      throw new Error('Falha ao baixar arquivo');
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    // Determinar nome do arquivo
    let filename = file.name;
    if (file.mimeType.startsWith('application/vnd.google-apps.')) {
      // Adicionar extensão apropriada
      if (targetMimeType.includes('presentation')) {
        filename = filename.endsWith('.pptx') ? filename : `${filename}.pptx`;
      } else if (targetMimeType.includes('document')) {
        filename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
      } else if (targetMimeType.includes('spreadsheet')) {
        filename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      }
    }

    logger.info('File downloaded', { 
      fileId, 
      filename,
      size: data.length,
    });

    return {
      data,
      mimeType: targetMimeType,
      filename,
      size: data.length,
    };
  }

  /**
   * Baixa uma apresentação como PPTX
   */
  async downloadPresentation(fileId: string): Promise<DriveDownloadResult> {
    return this.downloadFile({
      fileId,
      exportFormat: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
  }

  /**
   * Busca arquivos em todo o Drive
   */
  async searchFiles(query: string, options: Omit<DriveListOptions, 'query' | 'folderId'> = {}): Promise<DriveListResult> {
    return this.listFiles({
      ...options,
      query,
      folderId: undefined, // Buscar em todo o Drive
    });
  }

  /**
   * Obtém breadcrumb do caminho até o arquivo
   */
  async getFilePath(fileId: string): Promise<string[]> {
    const path: string[] = [];
    let currentId = fileId;

    while (currentId && currentId !== 'root') {
      const file = await this.getFile(currentId);
      path.unshift(file.name);

      if (file.parents && file.parents.length > 0) {
        currentId = file.parents[0];
      } else {
        break;
      }
    }

    return path;
  }

  /**
   * Verifica se é uma apresentação válida
   */
  isPresentationFile(file: DriveFile): boolean {
    return PPTX_MIME_TYPES.includes(file.mimeType);
  }

  /**
   * Obtém informações do usuário autenticado
   */
  async getUserInfo(): Promise<{ email: string; name: string; picture?: string }> {
    const token = await this.ensureValidToken();

    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Falha ao obter informações do usuário');
    }

    return response.json();
  }

  /**
   * Revoga tokens
   */
  async revokeTokens(): Promise<void> {
    if (!this.tokens) return;

    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${this.tokens.accessToken}`, {
        method: 'POST',
      });
      
      logger.info('Tokens revoked');
    } catch (error) {
      logger.warn('Failed to revoke tokens', error instanceof Error ? error : undefined);
    } finally {
      this.tokens = null;
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Cria cliente do Google Drive
 */
export function createGoogleDriveClient(config?: Partial<GoogleAuthConfig>): GoogleDriveClient {
  return new GoogleDriveClient(config);
}

/**
 * Verifica se credenciais do Google Drive estão configuradas
 */
export function isGoogleDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Obtém tipos MIME de apresentação suportados
 */
export function getSupportedPresentationMimeTypes(): string[] {
  return [...PPTX_MIME_TYPES];
}
