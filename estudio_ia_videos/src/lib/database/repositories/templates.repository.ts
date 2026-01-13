/**
 * Templates Repository
 * Gerenciamento de templates reutilizáveis
 */

import { prisma } from '@lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateTemplateData {
  name: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  templateData: Record<string, any>;
  isPremium?: boolean;
  isPublic?: boolean;
  createdBy?: string;
}

export interface TemplateFilters {
  category?: string;
  isPublic?: boolean;
  createdBy?: string;
  search?: string;
}

export class TemplatesRepository {
  /**
   * Cria um novo template
   */
  async create(data: CreateTemplateData) {
    return prisma.templates.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category || 'general',
        thumbnailUrl: data.thumbnailUrl,
        previewUrl: data.previewUrl,
        templateData: data.templateData,
        isPremium: data.isPremium || false,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        createdBy: data.createdBy,
      },
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
   * Busca um template por ID
   */
  async findById(id: string) {
    return prisma.templates.findUnique({
      where: { id },
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
   * Lista templates com filtros
   */
  async findMany(filters?: TemplateFilters, options?: {
    limit?: number;
    offset?: number;
    orderBy?: Prisma.templatesOrderByWithRelationInput;
  }) {
    const where: Prisma.templatesWhereInput = {};

    if (filters?.category) where.category = filters.category;
    if (filters?.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters?.createdBy) where.createdBy = filters.createdBy;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.templates.findMany({
      where,
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy || { usageCount: 'desc' },
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
   * Busca templates públicos
   */
  async findPublic(limit?: number) {
    return prisma.templates.findMany({
      where: {
        isPublic: true,
      },
      take: limit,
      orderBy: { usageCount: 'desc' },
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
   * Incrementa o contador de uso
   */
  async incrementUsage(id: string) {
    return prisma.templates.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Atualiza um template
   */
  async update(id: string, data: Partial<CreateTemplateData>) {
    return prisma.templates.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        thumbnailUrl: data.thumbnailUrl,
        previewUrl: data.previewUrl,
        templateData: data.templateData,
        isPremium: data.isPremium,
        isPublic: data.isPublic,
      },
    });
  }

  /**
   * Deleta um template
   */
  async delete(id: string) {
    return prisma.templates.delete({
      where: { id },
    });
  }

  /**
   * Conta templates por categoria
   */
  async countByCategory() {
    return prisma.templates.groupBy({
      by: ['category'],
      _count: true,
    });
  }

  /**
   * Busca templates mais usados
   */
  async findMostUsed(limit: number = 10) {
    return prisma.templates.findMany({
      take: limit,
      orderBy: { usageCount: 'desc' },
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
}

export const templatesRepository = new TemplatesRepository();
