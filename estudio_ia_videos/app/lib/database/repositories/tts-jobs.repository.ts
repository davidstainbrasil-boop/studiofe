/**
 * TTS Jobs Repository
 * Gerenciamento de jobs de Text-to-Speech
 */

import { prisma } from '@/lib/prisma';
import { Prisma, JobStatus, TtsProvider } from '@prisma/client';

export interface CreateTtsJobData {
  userId: string;
  projectId?: string;
  slideId?: string;
  textContent: string;
  provider?: TtsProvider;
  voiceId?: string;
  voiceSettings?: Record<string, any>;
}

export interface TtsJobFilters {
  userId?: string;
  projectId?: string;
  slideId?: string;
  status?: JobStatus;
  provider?: TtsProvider;
}

export class TtsJobsRepository {
  /**
   * Cria um novo job de TTS
   */
  async create(data: CreateTtsJobData) {
    return prisma.ttsJob.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        slideId: data.slideId,
        textContent: data.textContent,
        provider: data.provider || TtsProvider.edge_tts,
        voiceId: data.voiceId,
        voiceSettings: data.voiceSettings || {},
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        slide: {
          select: {
            id: true,
            title: true,
            slideOrder: true,
          },
        },
      },
    });
  }

  /**
   * Busca um job por ID
   */
  async findById(id: string) {
    return prisma.ttsJob.findUnique({
      where: { id },
      include: {
        user: true,
        project: true,
        slide: true,
      },
    });
  }

  /**
   * Lista jobs com filtros
   */
  async findMany(filters?: TtsJobFilters, options?: {
    limit?: number;
    offset?: number;
    orderBy?: Prisma.TtsJobOrderByWithRelationInput;
  }) {
    const where: Prisma.TtsJobWhereInput = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.slideId) where.slideId = filters.slideId;
    if (filters?.status) where.status = filters.status;
    if (filters?.provider) where.provider = filters.provider;

    return prisma.ttsJob.findMany({
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
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        slide: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Atualiza o status de um job
   */
  async updateStatus(id: string, status: JobStatus, data?: {
    outputUrl?: string;
    errorMessage?: string;
    durationSeconds?: number;
  }) {
    return prisma.ttsJob.update({
      where: { id },
      data: {
        status,
        outputUrl: data?.outputUrl,
        errorMessage: data?.errorMessage,
        durationSeconds: data?.durationSeconds,
      },
    });
  }

  /**
   * Busca jobs pendentes
   */
  async findPending(limit?: number) {
    return prisma.ttsJob.findMany({
      where: {
        status: JobStatus.pending,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Deleta um job
   */
  async delete(id: string) {
    return prisma.ttsJob.delete({
      where: { id },
    });
  }

  /**
   * Conta jobs por status
   */
  async countByStatus(userId?: string) {
    const where: Prisma.TtsJobWhereInput = {};
    if (userId) where.userId = userId;

    return prisma.ttsJob.groupBy({
      by: ['status'],
      where,
      _count: true,
    });
  }
}

export const ttsJobsRepository = new TtsJobsRepository();
