/**
 * Session Service
 * Serviço de gerenciamento de sessões de usuário
 */

import { sessionsRepository, SessionRecord } from '../repositories';
import { sign } from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'mvp-videos-secret-key-2025-local';
const SESSION_EXPIRES_IN_DAYS = 7;

export interface CreateSessionParams {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionResult {
  session: {
    id: string;
    token: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
  };
}

/**
 * Converts a SessionRecord to SessionResult
 */
function sessionRecordToResult(session: SessionRecord, expiresAtOverride?: Date): SessionResult {
  const expiresAt = expiresAtOverride || new Date(session.expires_at);
  return {
    session: {
      id: session.id,
      token: session.token,
      expiresAt,
    },
    user: {
      id: session.user?.id || session.user_id,
      email: session.user?.email || '',
      name: session.user?.name || null,
      role: session.user?.role || 'user',
    },
  };
}

export class SessionService {
  /**
   * Cria uma nova sessão para um usuário
   */
  async createSession(params: CreateSessionParams): Promise<SessionResult> {
    // Calcula data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRES_IN_DAYS);

    // Cria a sessão no banco (repository já gera o token)
    const session = await sessionsRepository.create(params.userId, {
      ipAddress: params.ipAddress,
      deviceInfo: params.userAgent,
      expiresAt,
    });

    return sessionRecordToResult(session);
  }

  /**
   * Valida um token de sessão
   */
  async validateSession(token: string): Promise<SessionResult | null> {
    const session = await sessionsRepository.findByToken(token);
    
    if (!session) {
      return null;
    }

    // Verifica se a sessão não expirou
    if (new Date(session.expires_at) < new Date()) {
      // Deleta sessão expirada
      await sessionsRepository.deleteByToken(token);
      return null;
    }

    return sessionRecordToResult(session);
  }

  /**
   * Renova uma sessão (estende a data de expiração)
   */
  async renewSession(token: string): Promise<SessionResult | null> {
    const session = await sessionsRepository.findByToken(token);
    
    if (!session) {
      return null;
    }

    // Verifica se a sessão não expirou
    if (new Date(session.expires_at) < new Date()) {
      await sessionsRepository.deleteByToken(token);
      return null;
    }

    // Estende a data de expiração
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_EXPIRES_IN_DAYS);

    await sessionsRepository.updateExpiration(token, newExpiresAt);

    return sessionRecordToResult(session, newExpiresAt);
  }

  /**
   * Encerra uma sessão
   */
  async endSession(token: string): Promise<void> {
    await sessionsRepository.deleteByToken(token);
  }

  /**
   * Encerra todas as sessões de um usuário
   */
  async endAllUserSessions(userId: string): Promise<void> {
    await sessionsRepository.deleteByUserId(userId);
  }

  /**
   * Lista sessões ativas de um usuário
   */
  async getUserSessions(userId: string): Promise<SessionRecord[]> {
    const sessions = await sessionsRepository.findByUserId(userId);
    // Filter out expired sessions
    const now = new Date();
    return sessions.filter(s => new Date(s.expires_at) > now);
  }

  /**
   * Limpa sessões expiradas
   */
  async cleanupExpiredSessions(): Promise<void> {
    await sessionsRepository.deleteExpired();
  }

  /**
   * Gera um token único para a sessão
   */
  private generateToken(): string {
    // Gera um token aleatório de 64 caracteres
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Cria um JWT token para autenticação
   */
  createJwtToken(userId: string, email: string, role: string): string {
    return sign(
      {
        userId,
        email,
        role,
      },
      JWT_SECRET,
      {
        expiresIn: `${SESSION_EXPIRES_IN_DAYS}d`,
      }
    );
  }
}

export const sessionService = new SessionService();
