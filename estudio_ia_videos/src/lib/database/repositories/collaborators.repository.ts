/**
 * Collaborators Repository
 * Gerenciamento de colaboradores em projetos
 */

import { prisma } from '@lib/prisma';
import { Prisma, CollaborationRole } from '@prisma/client';

export interface CreateCollaboratorData {
  projectId: string;
  userId: string;
  role?: CollaborationRole;
  invitedBy?: string;
}

export interface CollaboratorFilters {
  projectId?: string;
  userId?: string;
  role?: CollaborationRole;
  accepted?: boolean;
}

export class CollaboratorsRepository {
  /**
   * Adiciona um colaborador a um projeto
   */
  async create(data: CreateCollaboratorData) {
    return prisma.collaborator.create({
      data: {
        projectId: data.projectId,
        userId: data.userId,
        role: data.role || CollaborationRole.viewer,
        invitedBy: data.invitedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        inviter: {
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
   * Busca um colaborador por ID
   */
  async findById(id: string) {
    return prisma.collaborator.findUnique({
      where: { id },
      include: {
        user: true,
        project: true,
        inviter: true,
      },
    });
  }

  /**
   * Busca colaborador por projeto e usuário
   */
  async findByProjectAndUser(projectId: string, userId: string) {
    return prisma.collaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      include: {
        user: true,
        project: true,
      },
    });
  }

  /**
   * Lista colaboradores com filtros
   */
  async findMany(filters?: CollaboratorFilters) {
    const where: Prisma.CollaboratorWhereInput = {};

    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.role) where.role = filters.role;
    if (filters?.accepted !== undefined) {
      if (filters.accepted) {
        where.acceptedAt = { not: null };
      } else {
        where.acceptedAt = null;
      }
    }

    return prisma.collaborator.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista colaboradores de um projeto
   */
  async findByProjectId(projectId: string) {
    return this.findMany({ projectId });
  }

  /**
   * Lista projetos de um usuário como colaborador
   */
  async findByUserId(userId: string) {
    return this.findMany({ userId });
  }

  /**
   * Aceita um convite de colaboração
   */
  async acceptInvite(projectId: string, userId: string) {
    return prisma.collaborator.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: {
        acceptedAt: new Date(),
      },
    });
  }

  /**
   * Atualiza o papel de um colaborador
   */
  async updateRole(projectId: string, userId: string, role: CollaborationRole) {
    return prisma.collaborator.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: { role },
    });
  }

  /**
   * Remove um colaborador
   */
  async delete(projectId: string, userId: string) {
    return prisma.collaborator.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }

  /**
   * Remove todos os colaboradores de um projeto
   */
  async deleteByProjectId(projectId: string) {
    return prisma.collaborator.deleteMany({
      where: { projectId },
    });
  }

  /**
   * Verifica se um usuário tem acesso a um projeto
   */
  async hasAccess(projectId: string, userId: string): Promise<boolean> {
    const collaborator = await this.findByProjectAndUser(projectId, userId);
    return collaborator !== null && collaborator.acceptedAt !== null;
  }

  /**
   * Verifica o papel de um colaborador
   */
  async getRole(projectId: string, userId: string): Promise<CollaborationRole | null> {
    const collaborator = await this.findByProjectAndUser(projectId, userId);
    return collaborator?.role || null;
  }
}

export const collaboratorsRepository = new CollaboratorsRepository();
