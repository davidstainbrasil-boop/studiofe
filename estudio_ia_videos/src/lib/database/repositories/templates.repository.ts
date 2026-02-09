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
    return (prisma.nr_templates.create as any)({
      data: {
        name: data.name,
        description: data.description,
        category: data.category || 'general',
        thumbnail_url: data.thumbnailUrl,
        preview_url: data.previewUrl,
        metadata: data.templateData, // Mapeado para metadata
        // isPremium não existe no schema templates, removido
        is_public: data.isPublic !== undefined ? data.isPublic : true,
        created_by: data.createdBy,
      } as any,
      include: {
        users: {
          select: {
            id: true,
            email: true,
          },
        },
      } as any,
    });
  }

  /**
   * Busca um template por ID
   */
  async findById(id: string) {
    return (prisma.nr_templates.findUnique as any)({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
          },
        },
      } as any,
    });
  }

  /**
   * Lista templates com filtros
   */
  async findMany(filters?: TemplateFilters, options?: {
    limit?: number;
    offset?: number;
    orderBy?: Prisma.nr_templatesOrderByWithRelationInput;
  }) {
    const where: any = {};

    if (filters?.category) where.category = filters.category;
    if (filters?.isPublic !== undefined) where.is_public = filters.isPublic;
    if (filters?.createdBy) where.created_by = filters.createdBy;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return (prisma.nr_templates.findMany as any)({
      where,
      take: options?.limit,
      skip: options?.offset,
      orderBy: (options?.orderBy || { usage_count: 'desc' }) as any,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            
          },
        },
      } as any,
    });
  }

  /**
   * Busca templates públicos
   */
  async findPublic(limit?: number) {
    return (prisma.nr_templates.findMany as any)({
      where: {
        is_public: true,
      } as any,
      take: limit,
      orderBy: { usage_count: 'desc' } as any,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            
          },
        },
      } as any,
    });
  }

  /**
   * Incrementa o contador de uso
   */
  async incrementUsage(id: string) {
    return (prisma.nr_templates.update as any)({
      where: { id },
      data: {
        usage_count: {
          increment: 1,
        },
      } as any,
    });
  }

  /**
   * Atualiza um template
   */
  async update(id: string, data: Partial<CreateTemplateData>) {
    return (prisma.nr_templates.update as any)({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        thumbnail_url: data.thumbnailUrl,
        preview_url: data.previewUrl,
        metadata: data.templateData,
        // isPremium removido
        is_public: data.isPublic,
      } as any,
    });
  }

  /**
   * Deleta um template
   */
  async delete(id: string) {
    return prisma.nr_templates.delete({
      where: { id },
    });
  }

  /**
   * Conta templates por categoria
   */
  async countByCategory() {
    return (prisma.nr_templates.groupBy as any)({
      by: ['category'] as any,
      _count: true,
    });
  }

  /**
   * Busca templates mais usados
   */
  async findMostUsed(limit: number = 10) {
    return (prisma.nr_templates.findMany as any)({
      take: limit,
      orderBy: { usage_count: 'desc' } as any,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            
          },
        },
      } as any,
    });
  }
}

export const templatesRepository = new TemplatesRepository();
