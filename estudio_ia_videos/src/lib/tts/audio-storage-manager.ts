/**
 * Audio Storage Manager
 * Handles storage and management of TTS audio files
 */

import { logger } from '@/lib/monitoring/logger';
import { getRequiredEnv } from '@/lib/env';
import * as fs from 'node:fs/promises';
import * as path from 'path';

export interface StoredAudio {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number;
  url: string;
  path: string;
  metadata?: {
    provider: string;
    voiceId: string;
    textLength: number;
    processingTime: number;
    cost?: number;
    slideId?: string;
    projectId?: string;
  };
  createdAt: Date;
}

export interface AudioStorageConfig {
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class AudioStorageManager {
  private config: AudioStorageConfig;
  
  constructor(config?: Partial<AudioStorageConfig>) {
    this.config = {
      bucket: getRequiredEnv('AUDIO_STORAGE_BUCKET', 'project-audio'),
      region: getRequiredEnv('AUDIO_STORAGE_REGION', 'us-east-1'),
      endpoint: process.env.AUDIO_STORAGE_ENDPOINT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...config,
    };
  }

  /**
   * Store audio buffer with metadata
   */
  async storeAudio(
    audioBuffer: Buffer,
    filename: string,
    metadata: StoredAudio['metadata']
  ): Promise<StoredAudio> {
    try {
      const audioId = this.generateAudioId();
      const storagePath = `audio/${audioId}/${filename}`;
      
      // For now, store locally - in production would use S3
      const localPath = path.join(process.cwd(), 'uploads', 'audio', storagePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      
      // Write file
      await fs.writeFile(localPath, audioBuffer);
      
      const storedAudio: StoredAudio = {
        id: audioId,
        filename,
        originalName: filename,
        mimeType: 'audio/mpeg',
        size: audioBuffer.length,
        url: `/uploads/audio/${storagePath}`,
        path: storagePath,
        metadata: {
          ...metadata,
          provider: metadata?.provider || 'unknown',
          voiceId: metadata?.voiceId || 'unknown',
          textLength: metadata?.textLength || 0,
          processingTime: metadata?.processingTime || 0,
        },
        createdAt: new Date(),
      };

      logger.info('Audio stored successfully', {
        audioId,
        filename,
        size: audioBuffer.length,
        provider: metadata?.provider,
      });

      return storedAudio;

    } catch (error) {
      logger.error('Failed to store audio', error instanceof Error ? error : new Error(String(error)), {
        filename,
        provider: metadata?.provider,
      });
      
      throw new Error(`Failed to store audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve stored audio information
   */
  async getAudio(audioId: string): Promise<StoredAudio | null> {
    try {
      // Search for audio file
      const audioDir = path.join(process.cwd(), 'uploads', 'audio', audioId);
      
      if (!fs.existsSync(audioDir)) {
        return null;
      }

      // Read metadata file
      const metadataPath = path.join(audioDir, 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      return {
        id: audioId,
        ...metadata,
        createdAt: new Date(metadata.createdAt),
      };

    } catch (error) {
      logger.error('Failed to retrieve audio', error instanceof Error ? error : new Error(String(error)), {
        audioId,
      });
      
      return null;
    }
  }

  /**
   * Delete audio file and metadata
   */
  async deleteAudio(audioId: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const audioDir = path.join(process.cwd(), 'uploads', 'audio', audioId);
      
      if (!fs.existsSync(audioDir)) {
        return false; // Already doesn't exist
      }

      // Remove directory and all contents
      await fs.rm(audioDir, { recursive: true });
      
      logger.info('Audio deleted successfully', { audioId });
      
      return true;

    } catch (error) {
      logger.error('Failed to delete audio', error instanceof Error ? error : new Error(String(error)), {
        audioId,
      });
      
      return false;
    }
  }

  /**
   * List stored audio files
   */
  async listAudio(projectId?: string): Promise<StoredAudio[]> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const audioDir = path.join(process.cwd(), 'uploads', 'audio');
      
      if (!fs.existsSync(audioDir)) {
        return [];
      }

      const entries = await fs.readdir(audioDir, { withFileTypes: true });
      const audioFiles: StoredAudio[] = [];

      for (const entry of entries) {
        if (entry.isDirectory) {
          const metadataPath = path.join(entry.name, 'metadata.json');
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            
            // Filter by project if specified
            if (!projectId || metadata.projectId === projectId) {
              audioFiles.push({
                id: entry.name,
                ...metadata,
                createdAt: new Date(metadata.createdAt),
              });
            }
          } catch {
            // Skip if metadata is corrupted
            continue;
          }
        }
      }

      return audioFiles;

    } catch (error) {
      logger.error('Failed to list audio files', error instanceof Error ? error : new Error(String(error)));
      
      return [];
    }
  }

  /**
   * Generate unique audio ID
   */
  private generateAudioId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `audio_${timestamp}_${random}`;
  }

  /**
   * Get public URL for audio
   */
  getPublicUrl(storedAudio: StoredAudio): string {
    const baseUrl = getRequiredEnv('PUBLIC_URL', 'http://localhost:3001');
    return `${baseUrl}${storedAudio.url}`;
  }

  /**
   * Cleanup old audio files (older than specified days)
   */
  async cleanupOldAudio(daysOld: number = 7): Promise<number> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const audioDir = path.join(process.cwd(), 'uploads', 'audio');
      
      if (!fs.existsSync(audioDir)) {
        return 0;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let deletedCount = 0;
      const entries = await fs.readdir(audioDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory) {
          const metadataPath = path.join(entry.name, 'metadata.json');
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            const createdAt = new Date(metadata.createdAt);

            if (createdAt < cutoffDate) {
              await fs.rm(path.join(audioDir, entry.name), { recursive: true });
              deletedCount++;
              
              logger.debug('Deleted old audio', {
                audioId: entry.name,
                createdAt: metadata.createdAt,
              });
            }
          } catch {
            // Skip if metadata is corrupted
            continue;
          }
        }
      }

      logger.info('Audio cleanup completed', { deletedCount });
      
      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup old audio', error instanceof Error ? error : new Error(String(error)));
      
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    try {
      const audioFiles = await this.listAudio();
      
      if (audioFiles.length === 0) {
        return {
          totalFiles: 0,
          totalSize: 0,
        };
      }

      const totalSize = audioFiles.reduce((sum, audio) => sum + audio.size, 0);
      const dates = audioFiles.map(audio => audio.createdAt);
      const oldestFile = new Date(Math.min(...dates));
      const newestFile = new Date(Math.max(...dates));

      return {
        totalFiles: audioFiles.length,
        totalSize,
        oldestFile,
        newestFile,
      };

    } catch (error) {
      logger.error('Failed to get storage stats', error instanceof Error ? error : new Error(String(error)));
      
      return {
        totalFiles: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Validate audio file format
   */
  static validateAudioFile(buffer: Buffer): {
    isValid: boolean;
    format?: string;
    duration?: number;
  } {
    try {
      // Basic validation - check if it's a valid audio format
      const validFormats = [
        { header: [0xFF, 0xFB], type: 'mp3' },
        { header: [0x52, 0x49, 0x46, 0x46], type: 'wav' },
        { header: [0x4F, 0x67, 0x67, 0x53], type: 'ogg' },
      ];

      const header = buffer.slice(0, 4);
      let detectedFormat = null;

      for (const format of validFormats) {
        if (format.header.every((byte, index) => header[index] === byte)) {
          detectedFormat = format.type;
          break;
        }
      }

      return {
        isValid: detectedFormat !== null,
        format: detectedFormat,
        duration: undefined, // Would need audio processing library to calculate
      };

    } catch {
      return {
        isValid: false,
        format: undefined,
        duration: undefined,
      };
    }
  }
}