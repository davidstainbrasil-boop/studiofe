/**
 * Google OAuth Authentication
 *
 * Handles Google OAuth 2.0 flow for accessing Google Slides
 */

import { Logger } from '@lib/logger';

const logger = new Logger('google-auth');

// =============================================================================
// Types
// =============================================================================

export interface GoogleCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/auth/callback',
  scopes: [
    'https://www.googleapis.com/auth/presentations.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'openid',
    'email',
    'profile',
  ],
};

// =============================================================================
// Google Auth Class
// =============================================================================

export class GoogleAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes: string[];

  constructor(config?: Partial<typeof GOOGLE_CONFIG>) {
    this.clientId = config?.clientId || GOOGLE_CONFIG.clientId;
    this.clientSecret = config?.clientSecret || GOOGLE_CONFIG.clientSecret;
    this.redirectUri = config?.redirectUri || GOOGLE_CONFIG.redirectUri;
    this.scopes = config?.scopes || GOOGLE_CONFIG.scopes;
  }

  /**
   * Check if Google OAuth is configured
   */
  get isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.set('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleCredentials> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Token exchange failed', new Error(error.error_description || error.error));
      throw new Error(error.error_description || 'Failed to exchange code for tokens');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleCredentials> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to refresh token');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Refresh token stays the same
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  }

  /**
   * Get user information
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST',
    });
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(credentials: GoogleCredentials): boolean {
    return Date.now() >= credentials.expiresAt - 60000; // 1 minute buffer
  }

  /**
   * Get valid access token, refreshing if needed
   */
  async getValidAccessToken(credentials: GoogleCredentials): Promise<string> {
    if (!this.isTokenExpired(credentials)) {
      return credentials.accessToken;
    }

    if (!credentials.refreshToken) {
      throw new Error('Token expired and no refresh token available');
    }

    const newCredentials = await this.refreshAccessToken(credentials.refreshToken);
    return newCredentials.accessToken;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let authInstance: GoogleAuth | null = null;

export function getGoogleAuth(): GoogleAuth {
  if (!authInstance) {
    authInstance = new GoogleAuth();
  }
  return authInstance;
}

export default GoogleAuth;
