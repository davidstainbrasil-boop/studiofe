/**
 * Cloud Storage Service
 * Integração com Google Drive e OneDrive para importação de arquivos
 * 
 * Features:
 * - OAuth2 para Google Drive e OneDrive
 * - File picker para seleção de arquivos
 * - Download direto de PPTX
 * - Sincronização de projetos
 * 
 * @module lib/cloud/cloud-storage-service
 */

// ============================================================================
// TYPES
// ============================================================================

export type CloudProvider = 'google-drive' | 'onedrive' | 'dropbox';

export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedAt: Date;
  createdAt?: Date;
  thumbnailUrl?: string;
  downloadUrl?: string;
  webViewUrl?: string;
  parentId?: string;
  path?: string;
  provider: CloudProvider;
}

export interface CloudFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  childCount?: number;
  provider: CloudProvider;
}

export interface CloudUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  storageUsed?: number;
  storageLimit?: number;
  provider: CloudProvider;
}

export interface CloudAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface CloudTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
}

export interface CloudConnection {
  provider: CloudProvider;
  user: CloudUser;
  tokens: CloudTokens;
  isActive: boolean;
  connectedAt: Date;
}

export interface FilePickerConfig {
  allowMultiple: boolean;
  allowedMimeTypes: string[];
  maxFileSize?: number; // bytes
  startFolder?: string;
}

export interface ImportResult {
  success: boolean;
  file?: CloudFile;
  localPath?: string;
  error?: string;
  downloadedAt?: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// PPTX MIME types
const PPTX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.google-apps.presentation', // Google Slides
];

// Google Drive config
const GOOGLE_DRIVE_CONFIG = {
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  apiBaseUrl: 'https://www.googleapis.com/drive/v3',
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
};

// OneDrive config
const ONEDRIVE_CONFIG = {
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  apiBaseUrl: 'https://graph.microsoft.com/v1.0',
  scopes: [
    'files.read',
    'user.read',
    'offline_access',
  ],
};

// ============================================================================
// LOGGER
// ============================================================================

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[CLOUD] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[CLOUD ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[CLOUD WARN] ${msg}`, meta || ''),
};

// ============================================================================
// CLOUD STORAGE SERVICE
// ============================================================================

export class CloudStorageService {
  private connections: Map<string, CloudConnection> = new Map();
  private pendingImports: Map<string, ImportResult> = new Map();

  // ==========================================================================
  // OAUTH - GOOGLE DRIVE
  // ==========================================================================

  /**
   * Gera URL de autorização do Google Drive
   */
  getGoogleAuthUrl(clientId: string, redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_DRIVE_CONFIG.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state }),
    });

    const url = `${GOOGLE_DRIVE_CONFIG.authUrl}?${params.toString()}`;
    logger.info('Google Auth URL gerada', { redirectUri });
    return url;
  }

  /**
   * Troca código por tokens do Google
   */
  async exchangeGoogleCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<CloudTokens> {
    const response = await fetch(GOOGLE_DRIVE_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Falha ao trocar código Google', { error });
      throw new Error(`Falha na autenticação Google: ${error}`);
    }

    const data = await response.json();

    const tokens: CloudTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope,
    };

    logger.info('Tokens Google obtidos com sucesso');
    return tokens;
  }

  /**
   * Renova tokens do Google
   */
  async refreshGoogleTokens(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<CloudTokens> {
    const response = await fetch(GOOGLE_DRIVE_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao renovar tokens Google');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Obtém informações do usuário Google
   */
  async getGoogleUser(accessToken: string): Promise<CloudUser> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao obter usuário Google');
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      provider: 'google-drive',
    };
  }

  // ==========================================================================
  // OAUTH - ONEDRIVE
  // ==========================================================================

  /**
   * Gera URL de autorização do OneDrive
   */
  getOneDriveAuthUrl(clientId: string, redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: ONEDRIVE_CONFIG.scopes.join(' '),
      response_mode: 'query',
      ...(state && { state }),
    });

    const url = `${ONEDRIVE_CONFIG.authUrl}?${params.toString()}`;
    logger.info('OneDrive Auth URL gerada', { redirectUri });
    return url;
  }

  /**
   * Troca código por tokens do OneDrive
   */
  async exchangeOneDriveCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<CloudTokens> {
    const response = await fetch(ONEDRIVE_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Falha ao trocar código OneDrive', { error });
      throw new Error(`Falha na autenticação OneDrive: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Renova tokens do OneDrive
   */
  async refreshOneDriveTokens(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<CloudTokens> {
    const response = await fetch(ONEDRIVE_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao renovar tokens OneDrive');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };
  }

  /**
   * Obtém informações do usuário OneDrive
   */
  async getOneDriveUser(accessToken: string): Promise<CloudUser> {
    const response = await fetch(`${ONEDRIVE_CONFIG.apiBaseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Falha ao obter usuário OneDrive');
    }

    const data = await response.json();

    // Obtém info de armazenamento
    const driveResponse = await fetch(`${ONEDRIVE_CONFIG.apiBaseUrl}/me/drive`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let storageUsed = 0;
    let storageLimit = 0;

    if (driveResponse.ok) {
      const driveData = await driveResponse.json();
      storageUsed = driveData.quota?.used || 0;
      storageLimit = driveData.quota?.total || 0;
    }

    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      storageUsed,
      storageLimit,
      provider: 'onedrive',
    };
  }

  // ==========================================================================
  // FILE OPERATIONS - GOOGLE DRIVE
  // ==========================================================================

  /**
   * Lista arquivos do Google Drive
   */
  async listGoogleDriveFiles(
    accessToken: string,
    folderId?: string,
    pageToken?: string
  ): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
    const params = new URLSearchParams({
      pageSize: '50',
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,thumbnailLink,webViewLink,parents)',
      orderBy: 'modifiedTime desc',
      ...(pageToken && { pageToken }),
    });

    // Filtra por pasta ou root
    const query = folderId 
      ? `'${folderId}' in parents and trashed = false`
      : `'root' in parents and trashed = false`;
    params.set('q', query);

    const response = await fetch(
      `${GOOGLE_DRIVE_CONFIG.apiBaseUrl}/files?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao listar arquivos do Google Drive');
    }

    const data = await response.json();

    const files: CloudFile[] = data.files.map((file: Record<string, unknown>) => ({
      id: file.id as string,
      name: file.name as string,
      mimeType: file.mimeType as string,
      size: parseInt(file.size as string) || 0,
      modifiedAt: new Date(file.modifiedTime as string),
      createdAt: file.createdTime ? new Date(file.createdTime as string) : undefined,
      thumbnailUrl: file.thumbnailLink as string | undefined,
      webViewUrl: file.webViewLink as string | undefined,
      parentId: (file.parents as string[])?.[0],
      provider: 'google-drive' as CloudProvider,
    }));

    return {
      files,
      nextPageToken: data.nextPageToken,
    };
  }

  /**
   * Lista apenas PPTXs do Google Drive
   */
  async listGoogleDrivePresentations(
    accessToken: string,
    pageToken?: string
  ): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
    const mimeTypeQueries = PPTX_MIME_TYPES.map(m => `mimeType='${m}'`).join(' or ');
    
    const params = new URLSearchParams({
      pageSize: '50',
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,thumbnailLink,webViewLink)',
      orderBy: 'modifiedTime desc',
      q: `(${mimeTypeQueries}) and trashed = false`,
      ...(pageToken && { pageToken }),
    });

    const response = await fetch(
      `${GOOGLE_DRIVE_CONFIG.apiBaseUrl}/files?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao listar apresentações do Google Drive');
    }

    const data = await response.json();

    const files: CloudFile[] = data.files.map((file: Record<string, unknown>) => ({
      id: file.id as string,
      name: file.name as string,
      mimeType: file.mimeType as string,
      size: parseInt(file.size as string) || 0,
      modifiedAt: new Date(file.modifiedTime as string),
      thumbnailUrl: file.thumbnailLink as string | undefined,
      webViewUrl: file.webViewLink as string | undefined,
      provider: 'google-drive' as CloudProvider,
    }));

    logger.info('Apresentações Google Drive listadas', { count: files.length });
    return { files, nextPageToken: data.nextPageToken };
  }

  /**
   * Download de arquivo do Google Drive
   */
  async downloadGoogleDriveFile(
    accessToken: string,
    fileId: string,
    mimeType: string
  ): Promise<ArrayBuffer> {
    let downloadUrl = `${GOOGLE_DRIVE_CONFIG.apiBaseUrl}/files/${fileId}?alt=media`;

    // Para Google Slides, exporta como PPTX
    if (mimeType === 'application/vnd.google-apps.presentation') {
      downloadUrl = `${GOOGLE_DRIVE_CONFIG.apiBaseUrl}/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.presentationml.presentation`;
    }

    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Falha ao baixar arquivo do Google Drive');
    }

    const buffer = await response.arrayBuffer();
    logger.info('Arquivo Google Drive baixado', { fileId, size: buffer.byteLength });
    return buffer;
  }

  // ==========================================================================
  // FILE OPERATIONS - ONEDRIVE
  // ==========================================================================

  /**
   * Lista arquivos do OneDrive
   */
  async listOneDriveFiles(
    accessToken: string,
    folderId?: string,
    skipToken?: string
  ): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
    const path = folderId
      ? `/me/drive/items/${folderId}/children`
      : '/me/drive/root/children';

    const params = new URLSearchParams({
      $top: '50',
      $select: 'id,name,file,size,lastModifiedDateTime,createdDateTime,parentReference,webUrl',
      $orderby: 'lastModifiedDateTime desc',
      ...(skipToken && { $skipToken: skipToken }),
    });

    const response = await fetch(
      `${ONEDRIVE_CONFIG.apiBaseUrl}${path}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao listar arquivos do OneDrive');
    }

    const data = await response.json();

    const files: CloudFile[] = data.value.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
      mimeType: (item.file as Record<string, string>)?.mimeType || 'folder',
      size: (item.size as number) || 0,
      modifiedAt: new Date(item.lastModifiedDateTime as string),
      createdAt: item.createdDateTime ? new Date(item.createdDateTime as string) : undefined,
      webViewUrl: item.webUrl as string | undefined,
      parentId: (item.parentReference as Record<string, string>)?.id,
      provider: 'onedrive' as CloudProvider,
    }));

    // Extrai skipToken do @odata.nextLink
    let nextPageToken: string | undefined;
    if (data['@odata.nextLink']) {
      const nextUrl = new URL(data['@odata.nextLink']);
      nextPageToken = nextUrl.searchParams.get('$skipToken') || undefined;
    }

    return { files, nextPageToken };
  }

  /**
   * Lista apenas PPTXs do OneDrive
   */
  async listOneDrivePresentations(
    accessToken: string,
    skipToken?: string
  ): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
    // OneDrive não suporta filtro por mime type direto, busca por extensão
    const params = new URLSearchParams({
      $top: '50',
      $select: 'id,name,file,size,lastModifiedDateTime,createdDateTime,webUrl',
      $orderby: 'lastModifiedDateTime desc',
      q: '.pptx OR .ppt',
      ...(skipToken && { $skipToken: skipToken }),
    });

    const response = await fetch(
      `${ONEDRIVE_CONFIG.apiBaseUrl}/me/drive/root/search(q='.pptx,.ppt')?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao listar apresentações do OneDrive');
    }

    const data = await response.json();

    const files: CloudFile[] = data.value
      .filter((item: Record<string, unknown>) => {
        const name = (item.name as string).toLowerCase();
        return name.endsWith('.pptx') || name.endsWith('.ppt');
      })
      .map((item: Record<string, unknown>) => ({
        id: item.id as string,
        name: item.name as string,
        mimeType: (item.file as Record<string, string>)?.mimeType || 
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: (item.size as number) || 0,
        modifiedAt: new Date(item.lastModifiedDateTime as string),
        createdAt: item.createdDateTime ? new Date(item.createdDateTime as string) : undefined,
        webViewUrl: item.webUrl as string | undefined,
        provider: 'onedrive' as CloudProvider,
      }));

    let nextPageToken: string | undefined;
    if (data['@odata.nextLink']) {
      const nextUrl = new URL(data['@odata.nextLink']);
      nextPageToken = nextUrl.searchParams.get('$skipToken') || undefined;
    }

    logger.info('Apresentações OneDrive listadas', { count: files.length });
    return { files, nextPageToken };
  }

  /**
   * Download de arquivo do OneDrive
   */
  async downloadOneDriveFile(
    accessToken: string,
    fileId: string
  ): Promise<ArrayBuffer> {
    const response = await fetch(
      `${ONEDRIVE_CONFIG.apiBaseUrl}/me/drive/items/${fileId}/content`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: 'follow',
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao baixar arquivo do OneDrive');
    }

    const buffer = await response.arrayBuffer();
    logger.info('Arquivo OneDrive baixado', { fileId, size: buffer.byteLength });
    return buffer;
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * Salva conexão do usuário
   */
  saveConnection(userId: string, connection: CloudConnection): void {
    const key = `${userId}:${connection.provider}`;
    this.connections.set(key, connection);
    logger.info('Conexão salva', { userId, provider: connection.provider });
  }

  /**
   * Obtém conexão do usuário
   */
  getConnection(userId: string, provider: CloudProvider): CloudConnection | undefined {
    const key = `${userId}:${provider}`;
    return this.connections.get(key);
  }

  /**
   * Remove conexão do usuário
   */
  removeConnection(userId: string, provider: CloudProvider): void {
    const key = `${userId}:${provider}`;
    this.connections.delete(key);
    logger.info('Conexão removida', { userId, provider });
  }

  /**
   * Lista conexões do usuário
   */
  listConnections(userId: string): CloudConnection[] {
    const connections: CloudConnection[] = [];
    for (const [key, connection] of this.connections) {
      if (key.startsWith(`${userId}:`)) {
        connections.push(connection);
      }
    }
    return connections;
  }

  // ==========================================================================
  // IMPORT OPERATIONS
  // ==========================================================================

  /**
   * Importa arquivo da nuvem
   */
  async importFile(
    accessToken: string,
    provider: CloudProvider,
    fileId: string,
    fileName: string,
    mimeType: string
  ): Promise<ImportResult> {
    try {
      let buffer: ArrayBuffer;

      if (provider === 'google-drive') {
        buffer = await this.downloadGoogleDriveFile(accessToken, fileId, mimeType);
      } else if (provider === 'onedrive') {
        buffer = await this.downloadOneDriveFile(accessToken, fileId);
      } else {
        throw new Error(`Provider não suportado: ${provider}`);
      }

      // Gera path local temporário
      const timestamp = Date.now();
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const localPath = `/tmp/imports/${timestamp}-${safeName}`;

      const result: ImportResult = {
        success: true,
        file: {
          id: fileId,
          name: fileName,
          mimeType,
          size: buffer.byteLength,
          modifiedAt: new Date(),
          provider,
        },
        localPath,
        downloadedAt: new Date(),
      };

      this.pendingImports.set(fileId, result);
      logger.info('Arquivo importado com sucesso', { fileId, fileName, size: buffer.byteLength });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Falha ao importar arquivo', { fileId, error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Obtém status de importação
   */
  getImportStatus(fileId: string): ImportResult | undefined {
    return this.pendingImports.get(fileId);
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Verifica se token está expirado
   */
  isTokenExpired(tokens: CloudTokens): boolean {
    return new Date() >= tokens.expiresAt;
  }

  /**
   * Verifica se arquivo é PPTX
   */
  isPresentationFile(mimeType: string, fileName: string): boolean {
    if (PPTX_MIME_TYPES.includes(mimeType)) {
      return true;
    }
    const ext = fileName.toLowerCase().split('.').pop();
    return ext === 'pptx' || ext === 'ppt';
  }

  /**
   * Formata tamanho de arquivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let cloudStorageInstance: CloudStorageService | null = null;

export function getCloudStorageService(): CloudStorageService {
  if (!cloudStorageInstance) {
    cloudStorageInstance = new CloudStorageService();
  }
  return cloudStorageInstance;
}

export default CloudStorageService;
