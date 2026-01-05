/**
 * Notifications Repository
 * Gerenciamento de notificações do sistema
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, any>;
}

export interface NotificationFilters {
  userId?: string;
  type?: string;
  isRead?: boolean;
}

export class NotificationsRepository {
  /**
   * Cria uma nova notificação
   */
  async create(data: CreateNotificationData) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      },
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
   * Cria múltiplas notificações
   */
  async createMany(data: CreateNotificationData[]) {
    return prisma.notification.createMany({
      data: data.map(item => ({
        userId: item.userId,
        type: item.type,
        title: item.title,
        message: item.message,
        data: item.data || {},
      })),
    });
  }

  /**
   * Busca uma notificação por ID
   */
  async findById(id: string) {
    return prisma.notification.findUnique({
      where: { id },
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
   * Lista notificações com filtros
   */
  async findMany(filters?: NotificationFilters, options?: {
    limit?: number;
    offset?: number;
    orderBy?: Prisma.NotificationOrderByWithRelationInput;
  }) {
    const where: Prisma.NotificationWhereInput = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.type) where.type = filters.type;
    if (filters?.isRead !== undefined) where.isRead = filters.isRead;

    return prisma.notification.findMany({
      where,
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy || { createdAt: 'desc' },
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
   * Busca notificações não lidas de um usuário
   */
  async findUnreadByUserId(userId: string, limit?: number) {
    return this.findMany(
      { userId, isRead: false },
      { limit, orderBy: { createdAt: 'desc' } }
    );
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marca todas as notificações de um usuário como lidas
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Deleta uma notificação
   */
  async delete(id: string) {
    return prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Deleta notificações lidas antigas
   */
  async deleteOldRead(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return prisma.notification.deleteMany({
      where: {
        isRead: true,
        readAt: {
          lt: cutoffDate,
        },
      },
    });
  }

  /**
   * Conta notificações não lidas de um usuário
   */
  async countUnreadByUserId(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Conta notificações por tipo
   */
  async countByType(userId?: string) {
    const where: Prisma.NotificationWhereInput = {};
    if (userId) where.userId = userId;

    return prisma.notification.groupBy({
      by: ['type'],
      where,
      _count: true,
    });
  }
}

export const notificationsRepository = new NotificationsRepository();
