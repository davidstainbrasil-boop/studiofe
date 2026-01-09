/**
 * Notification Service
 * Serviço de gerenciamento de notificações
 */

import { notificationsRepository } from '../repositories';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
}

export interface CreateBulkNotificationParams {
  userIds: string[];
  type: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Cria uma notificação
   */
  async createNotification(params: CreateNotificationParams) {
    return notificationsRepository.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data,
    });
  }

  /**
   * Cria notificações para múltiplos usuários
   */
  async createBulkNotifications(params: CreateBulkNotificationParams) {
    const notifications = params.userIds.map(userId => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data,
    }));

    return notificationsRepository.createMany(notifications);
  }

  /**
   * Notifica quando um render job é completado
   */
  async notifyRenderComplete(userId: string, renderJobId: string, projectId?: string, outputUrl?: string) {
    return this.createNotification({
      userId,
      type: 'render_complete',
      title: 'Renderização Concluída',
      message: 'Seu projeto foi renderizado com sucesso!',
      data: {
        renderJobId,
        projectId,
        outputUrl,
      },
    });
  }

  /**
   * Notifica quando um render job falha
   */
  async notifyRenderFailed(userId: string, renderJobId: string, projectId?: string, errorMessage?: string) {
    return this.createNotification({
      userId,
      type: 'render_failed',
      title: 'Renderização Falhou',
      message: errorMessage || 'Ocorreu um erro durante a renderização',
      data: {
        renderJobId,
        projectId,
        errorMessage,
      },
    });
  }

  /**
   * Notifica quando um colaborador é adicionado
   */
  async notifyCollaboratorAdded(userId: string, projectId: string, projectName: string, role: string) {
    return this.createNotification({
      userId,
      type: 'collaborator_added',
      title: 'Você foi adicionado como colaborador',
      message: `Você foi adicionado ao projeto "${projectName}" como ${role}`,
      data: {
        projectId,
        projectName,
        role,
      },
    });
  }

  /**
   * Notifica quando um comentário é adicionado
   */
  async notifyCommentAdded(userId: string, projectId: string, projectName: string, commentAuthor: string) {
    return this.createNotification({
      userId,
      type: 'comment_added',
      title: 'Novo comentário',
      message: `${commentAuthor} comentou no projeto "${projectName}"`,
      data: {
        projectId,
        projectName,
        commentAuthor,
      },
    });
  }

  /**
   * Busca notificações não lidas de um usuário
   */
  async getUnreadNotifications(userId: string, limit?: number) {
    return notificationsRepository.findUnreadByUserId(userId, limit);
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(notificationId: string) {
    return notificationsRepository.markAsRead(notificationId);
  }

  /**
   * Marca todas as notificações de um usuário como lidas
   */
  async markAllAsRead(userId: string) {
    return notificationsRepository.markAllAsRead(userId);
  }

  /**
   * Conta notificações não lidas
   */
  async countUnread(userId: string): Promise<number> {
    return notificationsRepository.countUnreadByUserId(userId);
  }

  /**
   * Deleta notificações antigas
   */
  async cleanupOldNotifications(daysOld: number = 30) {
    return notificationsRepository.deleteOldRead(daysOld);
  }
}

export const notificationService = new NotificationService();
