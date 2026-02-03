/**
 * ☁️ OneDrive Integration
 * 
 * Integração com Microsoft OneDrive para:
 * - Import de arquivos PPTX diretamente
 * - Navegação de pastas
 * - Download seguro de arquivos
 * 
 * Requer configuração de OAuth2:
 * - MICROSOFT_CLIENT_ID
 * - MICROSOFT_CLIENT_SECRET
 * - MICROSOFT_REDIRECT_URI
 */

// Simple logger for this module
const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(`[onedrive] ${message}`, context || '');
  },
  warn: (message: string, error?: Error) => {
    console.warn(`[onedrive] ${message}`, error?.message || '');
  },
  error: (message: string, error?: Error) => {
    console.error(`[onedrive] ${message}`, error?.message || '');
  },
};

// =============================================================================
// Types
// =============================================================================

export interface MicrosoftAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string;
  scopes: string[];
}

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  idToken?: string;
}

export interface OneDriveItem {
  id: string;
  name: string;
  size?: number;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  webUrl?: string;
  file?: {
    mimeType: string;
    hashes?: {
      quickXorHash?: string;
      sha1Hash?: string;
      sha256Hash?: string;
    };
  };
  folder?: {
    childCount: number;
  };
  parentReference?: {
    driveId: string;
    driveType: string;
    id: string;
    path: string;
  };
  thumbnails?: Array<{
    id: string;
    large?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
  }>;
  createdBy?: {
    user?: {
      displayName: string;
      email?: string;
      id: string;
    };
  };
  lastModifiedBy?: {
    user?: {
      displayName: string;
      email?: string;
      id: string;
    };
  };
  '@microsoft.graph.downloadUrl'?: string;
}

export interface OneDriveListOptions {
  folderId?: string;
  query?: string;
  pageSize?: number;
  skipToken?: string;
  orderBy?: string;
  filter?: string;
}

export interface OneDriveListResult {
  items: OneDriveItem[];
  nextLink?: string;
  skipToken?: string;
}

export interface OneDriveDownloadResult {
  data: Buffer;
  mimeType: string;
  filename: string;
  size: number;
}

// =============================================================================
// Constants
// =============================================================================

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com';
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

const DEFAULT_SCOPES = [
  'Files.Read',
  'Files.Read.All',
  'offline_access',
  'User.Read',
];

const PPTX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

const PPTX_EXTENSIONS = ['.pptx', '.ppt'];

// =============================================================================
// OneDriveClient Class
// =============================================================================

export class OneDriveClient {
  private config: MicrosoftAuthConfig;
  private tokens: MicrosoftTokens | null = null;

  constructor(config?: Partial<MicrosoftAuthConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.MICROSOFT_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || process.env.MICROSOFT_REDIRECT_URI || '',
      tenantId: config?.tenantId || process.env.MICROSOFT_TENANT_ID || 'common',
      scopes: config?.scopes || DEFAULT_SCOPES,
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      logger.warn('OneDrive credentials not configured');
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
      response_mode: 'query',
      ...(state && { state }),
    });

    return `${MICROSOFT_AUTH_URL}/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Troca código de autorização por tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
      code,
    });

    const response = await fetch(
      `${MICROSOFT_AUTH_URL}/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );

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
      idToken: data.id_token,
    };

    logger.info('Tokens obtained successfully');
    return this.tokens;
  }

  /**
   * Atualiza tokens usando refresh token
   */
  async refreshTokens(): Promise<MicrosoftTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('Refresh token não disponível');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.tokens.refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(
      `${MICROSOFT_AUTH_URL}/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to refresh tokens', new Error(error));
      throw new Error('Falha ao atualizar tokens');
    }

    const data = await response.json();

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      idToken: data.id_token,
    };

    logger.info('Tokens refreshed successfully');
    return this.tokens;
  }

  /**
   * Define tokens manualmente (ex: vindos do banco de dados)
   */
  setTokens(tokens: MicrosoftTokens): void {
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
   * Faz requisição autenticada à API do Graph
   */
  private async fetchGraph<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureValidToken();

    const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Graph API error: ${endpoint}`, new Error(error));
      throw new Error(`Erro na API do Graph: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Lista arquivos e pastas no OneDrive
   */
  async listItems(options: OneDriveListOptions = {}): Promise<OneDriveListResult> {
    const {
      folderId,
      query,
      pageSize = 50,
      skipToken,
      orderBy = 'name',
    } = options;

    let endpoint: string;
    
    if (query) {
      // Search across all files
      endpoint = `/me/drive/root/search(q='${encodeURIComponent(query)}')`;
    } else if (folderId && folderId !== 'root') {
      endpoint = `/me/drive/items/${folderId}/children`;
    } else {
      endpoint = '/me/drive/root/children';
    }

    const params = new URLSearchParams({
      '$top': pageSize.toString(),
      '$orderby': orderBy,
      '$select': 'id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder,parentReference,createdBy,lastModifiedBy',
      '$expand': 'thumbnails',
    });

    if (skipToken) {
      params.set('$skiptoken', skipToken);
    }

    const result = await this.fetchGraph<{
      value: OneDriveItem[];
      '@odata.nextLink'?: string;
    }>(`${endpoint}?${params.toString()}`);

    // Extract skipToken from nextLink
    let nextSkipToken: string | undefined;
    if (result['@odata.nextLink']) {
      const url = new URL(result['@odata.nextLink']);
      nextSkipToken = url.searchParams.get('$skiptoken') || undefined;
    }

    logger.info('Items listed', {
      folderId: folderId || 'root',
      count: result.value.length,
      hasMore: !!result['@odata.nextLink'],
    });

    return {
      items: result.value,
      nextLink: result['@odata.nextLink'],
      skipToken: nextSkipToken,
    };
  }

  /**
   * Lista apenas apresentações PPTX
   */
  async listPresentations(options: Omit<OneDriveListOptions, 'filter'> = {}): Promise<OneDriveListResult> {
    const { folderId, pageSize = 50, skipToken, orderBy = 'lastModifiedDateTime desc' } = options;

    // Use search to find PowerPoint files
    const searchQuery = PPTX_EXTENSIONS.join(' OR ');
    
    let endpoint = `/me/drive/root/search(q='${encodeURIComponent(searchQuery)}')`;
    
    if (folderId && folderId !== 'root') {
      endpoint = `/me/drive/items/${folderId}/search(q='${encodeURIComponent(searchQuery)}')`;
    }

    const params = new URLSearchParams({
      '$top': pageSize.toString(),
      '$orderby': orderBy,
      '$select': 'id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,parentReference,createdBy,lastModifiedBy',
      '$expand': 'thumbnails',
    });

    if (skipToken) {
      params.set('$skiptoken', skipToken);
    }

    const result = await this.fetchGraph<{
      value: OneDriveItem[];
      '@odata.nextLink'?: string;
    }>(`${endpoint}?${params.toString()}`);

    // Filter to only PowerPoint files
    const presentations = result.value.filter((item: OneDriveItem) => {
      if (item.folder) return false;
      if (!item.file) return false;
      
      const mimeType = item.file.mimeType;
      const name = item.name.toLowerCase();
      
      return PPTX_MIME_TYPES.includes(mimeType) || 
             PPTX_EXTENSIONS.some((ext: string) => name.endsWith(ext));
    });

    let nextSkipToken: string | undefined;
    if (result['@odata.nextLink']) {
      const url = new URL(result['@odata.nextLink']);
      nextSkipToken = url.searchParams.get('$skiptoken') || undefined;
    }

    logger.info('Presentations listed', { count: presentations.length });

    return {
      items: presentations,
      nextLink: result['@odata.nextLink'],
      skipToken: nextSkipToken,
    };
  }

  /**
   * Obtém detalhes de um item
   */
  async getItem(itemId: string): Promise<OneDriveItem> {
    const params = new URLSearchParams({
      '$select': 'id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder,parentReference,createdBy,lastModifiedBy,@microsoft.graph.downloadUrl',
      '$expand': 'thumbnails',
    });

    return this.fetchGraph<OneDriveItem>(`/me/drive/items/${itemId}?${params.toString()}`);
  }

  /**
   * Baixa um arquivo
   */
  async downloadFile(itemId: string): Promise<OneDriveDownloadResult> {
    const token = await this.ensureValidToken();

    // Get item with download URL
    const item = await this.getItem(itemId);

    if (!item.file) {
      throw new Error('Item não é um arquivo');
    }

    const downloadUrl = item['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) {
      throw new Error('URL de download não disponível');
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

    logger.info('File downloaded', {
      itemId,
      filename: item.name,
      size: data.length,
    });

    return {
      data,
      mimeType: item.file.mimeType,
      filename: item.name,
      size: data.length,
    };
  }

  /**
   * Baixa uma apresentação
   */
  async downloadPresentation(itemId: string): Promise<OneDriveDownloadResult> {
    const item = await this.getItem(itemId);

    if (!item.file) {
      throw new Error('Item não é um arquivo');
    }

    if (!this.isPresentationFile(item)) {
      throw new Error('Arquivo não é uma apresentação válida');
    }

    return this.downloadFile(itemId);
  }

  /**
   * Verifica se é uma apresentação válida
   */
  isPresentationFile(item: OneDriveItem): boolean {
    if (!item.file) return false;
    
    const mimeType = item.file.mimeType;
    const name = item.name.toLowerCase();
    
    return PPTX_MIME_TYPES.includes(mimeType) || 
           PPTX_EXTENSIONS.some((ext: string) => name.endsWith(ext));
  }

  /**
   * Obtém breadcrumb do caminho até o item
   */
  async getItemPath(itemId: string): Promise<string[]> {
    const item = await this.getItem(itemId);
    
    if (!item.parentReference?.path) {
      return [item.name];
    }

    // Path format: /drive/root:/folder1/folder2
    const pathParts = item.parentReference.path
      .replace('/drive/root:', '')
      .split('/')
      .filter(Boolean);
    
    pathParts.push(item.name);
    
    return pathParts;
  }

  /**
   * Obtém informações do usuário autenticado
   */
  async getUserInfo(): Promise<{ email: string; name: string; id: string }> {
    const user = await this.fetchGraph<{
      id: string;
      displayName: string;
      mail?: string;
      userPrincipalName: string;
    }>('/me');

    return {
      id: user.id,
      name: user.displayName,
      email: user.mail || user.userPrincipalName,
    };
  }

  /**
   * Obtém informações da quota do OneDrive
   */
  async getDriveInfo(): Promise<{
    total: number;
    used: number;
    remaining: number;
    state: string;
  }> {
    const drive = await this.fetchGraph<{
      quota: {
        total: number;
        used: number;
        remaining: number;
        state: string;
      };
    }>('/me/drive');

    return drive.quota;
  }

  /**
   * Revoga tokens
   */
  async revokeTokens(): Promise<void> {
    // Microsoft doesn't have a simple revoke endpoint
    // Just clear local tokens
    this.tokens = null;
    logger.info('Tokens cleared');
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Cria cliente do OneDrive
 */
export function createOneDriveClient(config?: Partial<MicrosoftAuthConfig>): OneDriveClient {
  return new OneDriveClient(config);
}

/**
 * Verifica se credenciais do OneDrive estão configuradas
 */
export function isOneDriveConfigured(): boolean {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

/**
 * Obtém tipos MIME de apresentação suportados
 */
export function getSupportedPresentationMimeTypes(): string[] {
  return [...PPTX_MIME_TYPES];
}
