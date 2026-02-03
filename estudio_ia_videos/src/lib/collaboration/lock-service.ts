/**
 * 🔒 Lock Service
 * Gerencia locks de tracks para evitar conflitos de edição
 */

import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import type { TrackLock, LockRequest, LockResult } from './types';

const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutos
const LOCK_RENEWAL_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos antes de expirar

export class LockService {
  private static instance: LockService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private initialized = false;
  
  private constructor() {
    // Don't start cleanup interval in constructor
    // It will be started on first actual use
  }
  
  /**
   * Initialize the cleanup interval (call after confirming DB is ready)
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    // Cleanup de locks expirados a cada minuto
    this.cleanupInterval = setInterval(() => this.cleanupExpiredLocks(), 60000);
  }
  
  static getInstance(): LockService {
    if (!LockService.instance) {
      LockService.instance = new LockService();
    }
    return LockService.instance;
  }
  
  /**
   * Tenta adquirir um lock em uma track
   */
  async acquireLock(request: LockRequest): Promise<LockResult> {
    const { projectId, trackId, userId, userName, userColor } = request;
    
    try {
      // Verificar se já existe um lock ativo
      const existingLock = await this.getLock(projectId, trackId);
      
      if (existingLock) {
        // Se o lock é do mesmo usuário, renovar
        if (existingLock.userId === userId) {
          return await this.renewLock(existingLock.id);
        }
        
        // Lock pertence a outro usuário
        return {
          success: false,
          error: `Track bloqueada por ${existingLock.userName}`,
          existingLock
        };
      }
      
      // Criar novo lock
      const lockExpiresAt = new Date(Date.now() + LOCK_DURATION_MS);
      
      const lock = await prisma.timeline_track_locks.create({
        data: {
          projectId,
          trackId,
          userId,
          expiresAt: lockExpiresAt
        }
      });
      
      const trackLock: TrackLock = {
        id: lock.id,
        projectId: lock.projectId,
        trackId: lock.trackId,
        userId: lock.userId,
        userName,
        userColor,
        createdAt: lock.createdAt,
        expiresAt: lock.expiresAt
      };
      
      logger.info('Lock acquired', {
        component: 'LockService',
        projectId,
        trackId,
        userId
      });
      
      return { success: true, lock: trackLock };
      
    } catch (error) {
      // Conflito de unique constraint = outro usuário pegou o lock primeiro
      if ((error as { code?: string }).code === 'P2002') {
        const existingLock = await this.getLock(projectId, trackId);
        return {
          success: false,
          error: 'Lock já adquirido por outro usuário',
          existingLock: existingLock ?? undefined
        };
      }
      
      logger.error('Failed to acquire lock', error as Error, {
        component: 'LockService',
        projectId,
        trackId
      });
      
      return {
        success: false,
        error: 'Erro ao adquirir lock'
      };
    }
  }
  
  /**
   * Libera um lock
   */
  async releaseLock(projectId: string, trackId: string, userId: string): Promise<boolean> {
    try {
      const result = await prisma.timeline_track_locks.deleteMany({
        where: {
          projectId,
          trackId,
          userId
        }
      });
      
      if (result.count > 0) {
        logger.info('Lock released', {
          component: 'LockService',
          projectId,
          trackId,
          userId
        });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to release lock', error as Error, {
        component: 'LockService',
        projectId,
        trackId
      });
      return false;
    }
  }
  
  /**
   * Libera todos os locks de um usuário em um projeto
   */
  async releaseAllUserLocks(projectId: string, userId: string): Promise<number> {
    try {
      const result = await prisma.timeline_track_locks.deleteMany({
        where: {
          projectId,
          userId
        }
      });
      
      logger.info('All user locks released', {
        component: 'LockService',
        projectId,
        userId,
        count: result.count
      });
      
      return result.count;
    } catch (error) {
      logger.error('Failed to release user locks', error as Error, {
        component: 'LockService',
        projectId,
        userId
      });
      return 0;
    }
  }
  
  /**
   * Obtém um lock específico
   */
  async getLock(projectId: string, trackId: string): Promise<TrackLock | null> {
    try {
      const lock = await prisma.timeline_track_locks.findFirst({
        where: {
          projectId,
          trackId,
          expiresAt: { gt: new Date() }
        },
        include: {
          users: {
            select: {
              name: true
            }
          }
        }
      });
      
      if (!lock) return null;
      
      return {
        id: lock.id,
        projectId: lock.projectId,
        trackId: lock.trackId,
        userId: lock.userId,
        userName: lock.users?.name || 'Unknown',
        userColor: '#3B82F6', // Default color, should be stored or computed
        createdAt: lock.createdAt,
        expiresAt: lock.expiresAt
      };
    } catch (error) {
      logger.error('Failed to get lock', error as Error, {
        component: 'LockService',
        projectId,
        trackId
      });
      return null;
    }
  }
  
  /**
   * Obtém todos os locks de um projeto
   */
  async getProjectLocks(projectId: string): Promise<TrackLock[]> {
    try {
      const locks = await prisma.timeline_track_locks.findMany({
        where: {
          projectId,
          expiresAt: { gt: new Date() }
        },
        include: {
          users: {
            select: {
              name: true
            }
          }
        }
      });
      
      return locks.map((lock, index) => ({
        id: lock.id,
        projectId: lock.projectId,
        trackId: lock.trackId,
        userId: lock.userId,
        userName: lock.users?.name || 'Unknown',
        userColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
        createdAt: lock.createdAt,
        expiresAt: lock.expiresAt
      }));
    } catch (error) {
      logger.error('Failed to get project locks', error as Error, {
        component: 'LockService',
        projectId
      });
      return [];
    }
  }
  
  /**
   * Renova um lock existente
   */
  async renewLock(lockId: string): Promise<LockResult> {
    try {
      const renewExpiresAt = new Date(Date.now() + LOCK_DURATION_MS);
      
      const lock = await prisma.timeline_track_locks.update({
        where: { id: lockId },
        data: {
          expiresAt: renewExpiresAt,
          updatedAt: new Date()
        },
        include: {
          users: {
            select: { name: true }
          }
        }
      });
      
      return {
        success: true,
        lock: {
          id: lock.id,
          projectId: lock.projectId,
          trackId: lock.trackId,
          userId: lock.userId,
          userName: lock.users?.name || 'Unknown',
          userColor: '#3B82F6',
          createdAt: lock.createdAt,
          expiresAt: lock.expiresAt
        }
      };
    } catch (error) {
      logger.error('Failed to renew lock', error as Error, {
        component: 'LockService',
        lockId
      });
      return {
        success: false,
        error: 'Erro ao renovar lock'
      };
    }
  }
  
  /**
   * Verifica se um usuário tem lock em uma track
   */
  async hasLock(projectId: string, trackId: string, userId: string): Promise<boolean> {
    const lock = await this.getLock(projectId, trackId);
    return lock?.userId === userId;
  }
  
  /**
   * Verifica se um lock precisa ser renovado
   */
  async shouldRenewLock(lockId: string): Promise<boolean> {
    try {
      const lock = await prisma.timeline_track_locks.findUnique({
        where: { id: lockId }
      });
      
      if (!lock) return false;
      
      const timeUntilExpiry = lock.expiresAt.getTime() - Date.now();
      return timeUntilExpiry < LOCK_RENEWAL_THRESHOLD_MS;
    } catch {
      return false;
    }
  }
  
  /**
   * Limpa locks expirados
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await prisma.timeline_track_locks.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      
      if (result.count > 0) {
        logger.info('Expired locks cleaned up', {
          component: 'LockService',
          count: result.count
        });
      }
      
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired locks', error as Error, {
        component: 'LockService'
      });
      return 0;
    }
  }
  
  /**
   * Para o serviço e limpa recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const lockService = LockService.getInstance();
