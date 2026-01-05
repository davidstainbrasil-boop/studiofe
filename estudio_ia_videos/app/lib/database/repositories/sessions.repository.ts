/**
 * Sessions Repository
 * Gerenciamento de sessões de usuário
 */

import { prisma } from '@/lib/prisma';
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
    return prisma.session.create({
      data: {
        userId: data.userId,
        token: data.token,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
      include: {
        user: {
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
    return prisma.session.findUnique({
      where: { token },
      include: {
        user: {
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
    const where: Prisma.SessionWhereInput = {
      userId,
    };

    if (filters?.expired !== undefined) {
      if (filters.expired) {
        where.expiresAt = { lt: new Date() };
      } else {
        where.expiresAt = { gte: new Date() };
      }
    }

    return prisma.session.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
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
    return prisma.session.delete({
      where: { token },
    });
  }

  /**
   * Deleta todas as sessões de um usuário
   */
  async deleteByUserId(userId: string) {
    return prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Deleta sessões expiradas
   */
  async deleteExpired() {
    return prisma.session.deleteMany({
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
    return prisma.session.update({
      where: { token },
      data: { expiresAt },
    });
  }

  /**
   * Conta sessões ativas de um usuário
   */
  async countActiveByUserId(userId: string): Promise<number> {
    return prisma.session.count({
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
