/**
 * Storage Files Repository
 * Gerenciamento de arquivos armazenados
 */

import { prisma } from '@lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateStorageFileData {
  userId: string;
  bucket?: string;
  filePath: string;
  originalName: string;
  mimeType?: string;
  fileSize?: bigint;
  checksum?: string;
  metadata?: Record<string, unknown>;
  isPublic?: boolean;
}

export interface StorageFileFilters {
  userId?: string;
  bucket?: string;
  mimeType?: string;
  isPublic?: boolean;
}

export class StorageFilesRepository {
  /**
   * Cria um novo registro de arquivo
   */
  async create(data: CreateStorageFileData) {
    return prisma.storage_files.create({
      data: {
        userId: data.userId,
        bucket: data.bucket || 'uploads',
        filePath: data.filePath,
        originalName: data.originalName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        checksum: data.checksum,
        metadata: data.metadata || {},
        isPublic: data.isPublic || false,
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
   * Busca um arquivo por ID
   */
  async findById(id: string) {
    return prisma.storage_files.findUnique({
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
   * Busca um arquivo por bucket e path
   */
  async findByPath(bucket: string, filePath: string) {
    return prisma.storage_files.findUnique({
      where: {
        bucket_filePath: {
          bucket,
          filePath,
        },
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
   * Lista arquivos com filtros
   */
  async findMany(filters?: StorageFileFilters, options?: {
    limit?: number;
    offset?: number;
    orderBy?: Prisma.storage_filesOrderByWithRelationInput;
  }) {
    const where: Prisma.storage_filesWhereInput = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.bucket) where.bucket = filters.bucket;
    if (filters?.mimeType) where.mimeType = filters.mimeType;
    if (filters?.isPublic !== undefined) where.isPublic = filters.isPublic;

    return prisma.storage_files.findMany({
      where,
      take: options?.limit,
      skip: options?.offset,
      orderBy: options?.orderBy || { createdAt: 'desc' },
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
   * Incrementa o contador de downloads
   */
  async incrementDownload(id: string) {
    return prisma.storage_files.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Atualiza metadados de um arquivo
   */
  async updateMetadata(id: string, metadata: Record<string, unknown>) {
    return prisma.storage_files.update({
      where: { id },
      data: {
        metadata,
      },
    });
  }

  /**
   * Deleta um arquivo
   */
  async delete(id: string) {
    return prisma.storage_files.delete({
      where: { id },
    });
  }

  /**
   * Deleta arquivos por usuário
   */
  async deleteByUserId(userId: string) {
    return prisma.storage_files.deleteMany({
      where: { userId },
    });
  }

  /**
   * Calcula o tamanho total de armazenamento de um usuário
   */
  async getTotalSizeByUserId(userId: string): Promise<bigint> {
    const result = await prisma.storage_files.aggregate({
      where: { userId },
      _sum: {
        fileSize: true,
      },
    });

    return result._sum.fileSize || BigInt(0);
  }

  /**
   * Conta arquivos por tipo MIME
   */
  async countByMimeType(userId?: string) {
    const where: Prisma.storage_filesWhereInput = {};
    if (userId) where.userId = userId;

    return prisma.storage_files.groupBy({
      by: ['mimeType'],
      where: {
        ...where,
        mimeType: { not: null },
      },
      _count: true,
      _sum: {
        fileSize: true,
      },
    });
  }
}

export const storageFilesRepository = new StorageFilesRepository();
