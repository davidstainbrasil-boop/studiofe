/**
 * Sessions Repository
 * Gerenciamento de sessões de usuário
 */

import { prisma } from '@lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateSessionData {
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface SessionFilters {
  userId?: string;
  token?: string;
  expired?: boolean;
}

export class SessionsRepository {
  /**
   * Cria uma nova sessão
   */
  async create(data: CreateSessionData) {
    return prisma.sessions.create({
      data: {
        userId: data.userId,
        token: data.token,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Busca uma sessão por token
   */
  async findByToken(token: string) {
    return prisma.sessions.findUnique({
      where: { token },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            isVerified: true,
          },
        },
      },
    });
  }

  /**
   * Busca sessões por usuário
   */
  async findByUserId(userId: string, filters?: SessionFilters) {
    const where: Prisma.sessionsWhereInput = {
      userId,
    };

    if (filters?.expired !== undefined) {
      if (filters.expired) {
        where.expiresAt = { lt: new Date() };
      } else {
        where.expiresAt = { gte: new Date() };
      }
    }

    return prisma.sessions.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Verifica se uma sessão é válida
   */
  async isValid(token: string): Promise<boolean> {
    const session = await this.findByToken(token);
    if (!session) return false;
    if (session.expiresAt < new Date()) return false;
    return true;
  }

  /**
   * Deleta uma sessão por token
   */
  async deleteByToken(token: string) {
    return prisma.sessions.delete({
      where: { token },
    });
  }

  /**
   * Deleta todas as sessões de um usuário
   */
  async deleteByUserId(userId: string) {
    return prisma.sessions.deleteMany({
      where: { userId },
    });
  }

  /**
   * Deleta sessões expiradas
   */
  async deleteExpired() {
    return prisma.sessions.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Atualiza a data de expiração de uma sessão
   */
  async updateExpiration(token: string, expiresAt: Date) {
    return prisma.sessions.update({
      where: { token },
      data: { expiresAt },
    });
  }

  /**
   * Conta sessões ativas de um usuário
   */
  async countActiveByUserId(userId: string): Promise<number> {
    return prisma.sessions.count({
      where: {
        userId,
        expiresAt: {
          gte: new Date(),
        },
      },
    });
  }
}

export const sessionsRepository = new SessionsRepository();
