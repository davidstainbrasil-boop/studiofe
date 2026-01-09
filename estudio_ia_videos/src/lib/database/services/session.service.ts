/**
 * Session Service
 * Serviço de gerenciamento de sessões de usuário
 */

import { sessionsRepository } from '../repositories';
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

export class SessionService {
  /**
   * Cria uma nova sessão para um usuário
   */
  async createSession(params: CreateSessionParams): Promise<SessionResult> {
    // Gera um token único
    const token = this.generateToken();
    
    // Calcula data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRES_IN_DAYS);

    // Cria a sessão no banco
    const session = await sessionsRepository.create({
      userId: params.userId,
      token,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt,
    });

    return {
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || 'user',
      },
    };
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
    if (session.expiresAt < new Date()) {
      // Deleta sessão expirada
      await sessionsRepository.deleteByToken(token);
      return null;
    }

    return {
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || 'user',
      },
    };
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
    if (session.expiresAt < new Date()) {
      await sessionsRepository.deleteByToken(token);
      return null;
    }

    // Estende a data de expiração
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_EXPIRES_IN_DAYS);

    await sessionsRepository.updateExpiration(token, newExpiresAt);

    return {
      session: {
        id: session.id,
        token: session.token,
        expiresAt: newExpiresAt,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || 'user',
      },
    };
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
  async getUserSessions(userId: string) {
    return sessionsRepository.findByUserId(userId, { expired: false });
  }

  /**
   * Limpa sessões expiradas
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await sessionsRepository.deleteExpired();
    return result.count;
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
