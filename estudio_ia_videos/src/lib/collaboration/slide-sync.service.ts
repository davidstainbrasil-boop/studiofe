/**
 * 🔄 Real-Time Slide Synchronization Service
 * Handles slide updates, versioning, and conflict resolution
 */

import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

interface SlideSyncOperation {
  type: 'create' | 'update' | 'delete' | 'reorder';
  slideId: string;
  projectId: string;
  userId: string;
  timestamp: Date;
  data: any;
  version: number;
}

interface SlideConflict {
  slideId: string;
  operations: SlideSyncOperation[];
  conflictingUsers: string[];
  resolution?: 'merge' | 'override' | 'manual';
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface SlideVersion {
  slideId: string;
  version: number;
  data: any;
  userId: string;
  timestamp: Date;
  checksum: string;
}

export class SlideSyncService {
  private static instance: SlideSyncService;
  private pendingOperations: Map<string, SlideSyncOperation[]> = new Map();
  private slideVersions: Map<string, SlideVersion[]> = new Map();
  private conflicts: Map<string, SlideConflict[]> = new Map();

  private constructor() {}

  static getInstance(): SlideSyncService {
    if (!SlideSyncService.instance) {
      SlideSyncService.instance = new SlideSyncService();
    }
    return SlideSyncService.instance;
  }

  /**
   * Process a slide synchronization operation
   */
  async processOperation(operation: SlideSyncOperation): Promise<{
    success: boolean;
    conflicts?: SlideConflict[];
    updatedVersion?: number;
  }> {
    try {
      logger.info('Processing slide sync operation', {
        type: operation.type,
        slideId: operation.slideId,
        projectId: operation.projectId,
        userId: operation.userId,
        service: 'SlideSyncService'
      });

      // Get current slide state
      const currentSlide = await this.getSlideFromDB(operation.slideId, operation.projectId);
      const latestVersion = this.getLatestVersion(operation.slideId);

      // Check for conflicts
      const conflicts = await this.detectConflicts(operation, currentSlide, latestVersion);
      
      if (conflicts.length > 0) {
        logger.warn('Slide sync conflicts detected', {
          slideId: operation.slideId,
          conflicts: conflicts.length,
          service: 'SlideSyncService'
        });

        // Store conflicts for resolution
        this.storeConflicts(operation.slideId, conflicts);

        return {
          success: false,
          conflicts
        };
      }

      // Apply operation
      const updatedVersion = await this.applyOperation(operation, currentSlide);

      // Broadcast to connected clients (handled by WebSocket server)
      await this.broadcastOperation(operation);

      return {
        success: true,
        updatedVersion
      };

    } catch (error) {
      logger.error('Error processing slide sync operation', error instanceof Error ? error : new Error(String(error)), {
        slideId: operation.slideId,
        userId: operation.userId,
        service: 'SlideSyncService'
      });

      return {
        success: false
      };
    }
  }

  /**
   * Detect conflicts between operations
   */
  private async detectConflicts(
    operation: SlideSyncOperation,
    currentSlide: any,
    latestVersion: SlideVersion | null
  ): Promise<SlideConflict[]> {
    const conflicts: SlideConflict[] = [];
    
    // Get pending operations for this slide
    const pending = this.pendingOperations.get(operation.slideId) || [];
    
    // Check for concurrent updates
    if (operation.type === 'update') {
      const concurrentUpdates = pending.filter(op => 
        op.type === 'update' && 
        op.userId !== operation.userId &&
        Math.abs(op.timestamp.getTime() - operation.timestamp.getTime()) < 5000 // Within 5 seconds
      );

      if (concurrentUpdates.length > 0) {
        conflicts.push({
          slideId: operation.slideId,
          operations: [operation, ...concurrentUpdates],
          conflictingUsers: [operation.userId, ...concurrentUpdates.map(op => op.userId)],
          resolution: 'manual'
        });
      }
    }

    // Check for version conflicts
    if (latestVersion && operation.version !== latestVersion.version) {
      conflicts.push({
        slideId: operation.slideId,
        operations: [operation],
        conflictingUsers: [operation.userId],
        resolution: 'manual'
      });
    }

    return conflicts;
  }

  /**
   * Apply operation to slide
   */
  private async applyOperation(
    operation: SlideSyncOperation,
    currentSlide: any
  ): Promise<number> {
    let updatedData: any;
    let newVersion: number;

    switch (operation.type) {
      case 'create':
        updatedData = operation.data;
        newVersion = 1;
        await this.createSlideInDB(operation.projectId, updatedData);
        break;

      case 'update':
        updatedData = { ...currentSlide, ...operation.data };
        newVersion = (currentSlide?.version || 0) + 1;
        await this.updateSlideInDB(operation.slideId, updatedData, newVersion);
        break;

      case 'delete':
        updatedData = currentSlide;
        newVersion = (currentSlide?.version || 0) + 1;
        await this.deleteSlideInDB(operation.slideId);
        break;

      case 'reorder':
        updatedData = currentSlide;
        newVersion = (currentSlide?.version || 0) + 1;
        await this.reorderSlidesInDB(operation.projectId, operation.data.slideIds);
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }

    // Update version tracking
    const slideVersion: SlideVersion = {
      slideId: operation.slideId,
      version: newVersion,
      data: updatedData,
      userId: operation.userId,
      timestamp: operation.timestamp,
      checksum: this.calculateChecksum(updatedData)
    };

    this.updateVersionTracking(operation.slideId, slideVersion);

    return newVersion;
  }

  /**
   * Resolve conflicts between operations
   */
  async resolveConflict(
    slideId: string,
    resolution: 'merge' | 'override' | 'manual',
    resolvedBy: string,
    mergeData?: any
  ): Promise<boolean> {
    try {
      const conflicts = this.conflicts.get(slideId) || [];
      
      if (conflicts.length === 0) {
        return false;
      }

      logger.info('Resolving slide conflicts', {
        slideId,
        resolution,
        resolvedBy,
        conflictsCount: conflicts.length,
        service: 'SlideSyncService'
      });

      for (const conflict of conflicts) {
        conflict.resolution = resolution;
        conflict.resolvedAt = new Date();
        conflict.resolvedBy = resolvedBy;
      }

      if (resolution === 'merge' && mergeData) {
        // Apply merged data
        await this.updateSlideInDB(slideId, mergeData, Date.now());
      } else if (resolution === 'override') {
        // Keep the latest operation's data
        const latestOperation = conflicts[0].operations[conflicts[0].operations.length - 1];
        await this.applyOperation(latestOperation, await this.getSlideFromDB(slideId, ''));
      }

      // Clear conflicts
      this.conflicts.delete(slideId);
      
      // Broadcast resolution
      await this.broadcastConflictResolution(slideId, resolution, resolvedBy);

      logger.info('Slide conflicts resolved', {
        slideId,
        resolution,
        service: 'SlideSyncService'
      });

      return true;

    } catch (error) {
      logger.error('Error resolving slide conflicts', error instanceof Error ? error : new Error(String(error)), {
        slideId,
        resolution,
        service: 'SlideSyncService'
      });
      
      return false;
    }
  }

  /**
   * Get slide history/versions
   */
  async getSlideHistory(slideId: string): Promise<SlideVersion[]> {
    const versions = this.slideVersions.get(slideId) || [];
    return versions.sort((a, b) => b.version - a.version);
  }

  /**
   * Revert slide to specific version
   */
  async revertToVersion(
    slideId: string,
    version: number,
    userId: string
  ): Promise<boolean> {
    try {
      const versions = await this.getSlideHistory(slideId);
      const targetVersion = versions.find(v => v.version === version);
      
      if (!targetVersion) {
        return false;
      }

      logger.info('Reverting slide to version', {
        slideId,
        targetVersion: version,
        userId,
        service: 'SlideSyncService'
      });

      // Create revert operation
      const revertOperation: SlideSyncOperation = {
        type: 'update',
        slideId,
        projectId: '',
        userId,
        timestamp: new Date(),
        data: targetVersion.data,
        version: Date.now()
      };

      const result = await this.processOperation(revertOperation);
      return result.success;

    } catch (error) {
      logger.error('Error reverting slide version', error instanceof Error ? error : new Error(String(error)), {
        slideId,
        version,
        service: 'SlideSyncService'
      });
      
      return false;
    }
  }

  // Database operations
  private async getSlideFromDB(slideId: string, projectId: string): Promise<any> {
    const slide = await prisma.slides.findUnique({
      where: { id: slideId }
    });
    return slide;
  }

  private async createSlideInDB(projectId: string, data: any): Promise<void> {
    await prisma.slides.create({
      data: {
        id: `slide-${Date.now()}`,
        projectId,
        order: data.order || 0,
        content: data.content || '',
        metadata: data.metadata || {},
        version: 1
      } as any
    });
  }

  private async updateSlideInDB(slideId: string, data: any, version: number): Promise<void> {
    await prisma.slides.update({
      where: { id: slideId },
      data: {
        content: data.content,
        metadata: data.metadata,
        version
      } as any
    });
  }

  private async deleteSlideInDB(slideId: string): Promise<void> {
    await prisma.slides.delete({
      where: { id: slideId }
    });
  }

  private async reorderSlidesInDB(projectId: string, slideIds: string[]): Promise<void> {
    // Update slide orders
    for (let i = 0; i < slideIds.length; i++) {
      await prisma.slides.update({
        where: { id: slideIds[i] },
        data: { order: i } as any
      });
    }
  }

  // Version tracking
  private getLatestVersion(slideId: string): SlideVersion | null {
    const versions = this.slideVersions.get(slideId) || [];
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  private updateVersionTracking(slideId: string, version: SlideVersion): void {
    if (!this.slideVersions.has(slideId)) {
      this.slideVersions.set(slideId, []);
    }
    
    const versions = this.slideVersions.get(slideId)!;
    versions.push(version);
    
    // Keep only last 50 versions
    if (versions.length > 50) {
      versions.splice(0, versions.length - 50);
    }
  }

  private storeConflicts(slideId: string, conflicts: SlideConflict[]): void {
    if (!this.conflicts.has(slideId)) {
      this.conflicts.set(slideId, []);
    }
    
    this.conflicts.get(slideId)!.push(...conflicts);
  }

  // Broadcasting (would be handled by WebSocket server)
  private async broadcastOperation(operation: SlideSyncOperation): Promise<void> {
    // This would emit to connected clients
    logger.debug('Broadcasting slide operation', {
      slideId: operation.slideId,
      type: operation.type,
      service: 'SlideSyncService'
    });
  }

  private async broadcastConflictResolution(slideId: string, resolution: string, resolvedBy: string): Promise<void> {
    // This would emit conflict resolution to clients
    logger.debug('Broadcasting conflict resolution', {
      slideId,
      resolution,
      resolvedBy,
      service: 'SlideSyncService'
    });
  }

  // Utility functions
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}

// Export singleton instance
export const slideSyncService = SlideSyncService.getInstance();

export type {
  SlideSyncOperation,
  SlideConflict,
  SlideVersion
};