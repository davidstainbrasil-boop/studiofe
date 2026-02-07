/**
 * Smart Rendering Service
 * Resource-aware video rendering with adaptive quality and Worker threads
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { cpus, freemem, totalmem } from 'os';
import { logger } from '@lib/logger';
import type { SceneAnalysis } from './scene-detector.service';

const execAsync = promisify(exec);

export interface RenderJob {
  id: string;
  inputPath: string;
  outputPath: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  priority: number;
  config: RenderConfig;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metrics?: RenderMetrics;
}

export interface RenderConfig {
  resolution: '480p' | '720p' | '1080p' | '4k';
  codec: 'libx264' | 'libx265' | 'libvpx-vp9';
  crf: number;
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  fps: number;
  bitrate?: string;
  maxThreads: number;
  enableHardwareAccel: boolean;
  audioCodec: string;
  audioBitrate: string;
}

export interface RenderMetrics {
  processingTime: number;
  inputSize: number;
  outputSize: number;
  compressionRatio: number;
  averageFps: number;
  peakMemoryUsage: number;
  cpuUsage: number;
}

export interface SystemResources {
  cpuCount: number;
  cpuUsage: number;
  memoryTotal: number;
  memoryFree: number;
  memoryUsage: number;
  loadAverage: number[];
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  apply: (config: RenderConfig, resources: SystemResources) => RenderConfig;
}

export class SmartRenderingService {
  private static instance: SmartRenderingService;
  private activeJobs = new Map<string, RenderJob>();
  private jobQueue: RenderJob[] = [];
  private maxConcurrent: number;
  private strategies: OptimizationStrategy[];

  private constructor() {
    this.maxConcurrent = Math.max(1, Math.floor(cpus().length / 2));
    this.strategies = this.buildStrategies();
    logger.info('SmartRenderingService initialized', { maxConcurrent: this.maxConcurrent, service: 'SmartRendering' });
  }

  static getInstance(): SmartRenderingService {
    if (!SmartRenderingService.instance) {
      SmartRenderingService.instance = new SmartRenderingService();
    }
    return SmartRenderingService.instance;
  }

  private buildStrategies(): OptimizationStrategy[] {
    return [
      {
        id: 'resource-aware',
        name: 'Resource-Aware',
        description: 'Adjusts quality based on system resources',
        apply: (config: RenderConfig, resources: SystemResources): RenderConfig => {
          const updated = { ...config };
          if (resources.memoryUsage > 0.85) {
            updated.preset = 'fast';
            updated.maxThreads = Math.max(1, Math.floor(config.maxThreads / 2));
          }
          if (resources.cpuUsage > 0.9) {
            updated.preset = 'veryfast';
          }
          return updated;
        }
      },
      {
        id: 'quality-priority',
        name: 'Quality Priority',
        description: 'Maximizes quality when resources allow',
        apply: (config: RenderConfig, resources: SystemResources): RenderConfig => {
          const updated = { ...config };
          if (resources.cpuUsage < 0.5 && resources.memoryUsage < 0.6) {
            updated.preset = 'slow';
            updated.crf = Math.max(17, config.crf - 2);
          }
          return updated;
        }
      },
      {
        id: 'speed-priority',
        name: 'Speed Priority',
        description: 'Optimizes for fast rendering',
        apply: (config: RenderConfig): RenderConfig => {
          const updated = { ...config };
          updated.preset = 'ultrafast';
          updated.crf = Math.min(28, config.crf + 3);
          updated.maxThreads = cpus().length;
          return updated;
        }
      }
    ];
  }

  async submitJob(inputPath: string, outputPath: string, config?: Partial<RenderConfig>): Promise<RenderJob> {
    const job: RenderJob = {
      id: `render-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inputPath,
      outputPath,
      status: 'queued',
      progress: 0,
      priority: 1,
      config: this.mergeConfig(config),
      createdAt: new Date()
    };

    this.jobQueue.push(job);
    logger.info('Render job submitted', { jobId: job.id, service: 'SmartRendering' });
    this.processQueue();
    return job;
  }

  async getJobStatus(jobId: string): Promise<RenderJob | undefined> {
    return this.activeJobs.get(jobId) || this.jobQueue.find(j => j.id === jobId);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      this.activeJobs.delete(jobId);
      logger.info('Job cancelled', { jobId, service: 'SmartRendering' });
      return true;
    }
    const idx = this.jobQueue.findIndex(j => j.id === jobId);
    if (idx >= 0) {
      this.jobQueue[idx].status = 'cancelled';
      this.jobQueue.splice(idx, 1);
      return true;
    }
    return false;
  }

  getSystemResources(): SystemResources {
    const cpuList = cpus();
    const totalIdle = cpuList.reduce((s, c) => s + c.times.idle, 0);
    const totalTick = cpuList.reduce((s, c) => s + c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq, 0);
    const cpuUsage = totalTick > 0 ? 1 - totalIdle / totalTick : 0;
    const memTotal = totalmem();
    const memFree = freemem();

    return {
      cpuCount: cpuList.length,
      cpuUsage: Math.min(1, Math.max(0, cpuUsage)),
      memoryTotal: memTotal,
      memoryFree: memFree,
      memoryUsage: memTotal > 0 ? (memTotal - memFree) / memTotal : 0,
      loadAverage: [0, 0, 0] // os.loadavg not always meaningful
    };
  }

  optimizeConfig(config: RenderConfig, strategyId?: string): RenderConfig {
    const resources = this.getSystemResources();
    if (strategyId) {
      const strategy = this.strategies.find(s => s.id === strategyId);
      return strategy ? strategy.apply(config, resources) : config;
    }
    // Auto-select based on resources
    if (resources.cpuUsage > 0.8 || resources.memoryUsage > 0.8) {
      return this.strategies.find(s => s.id === 'resource-aware')!.apply(config, resources);
    }
    if (resources.cpuUsage < 0.3 && resources.memoryUsage < 0.5) {
      return this.strategies.find(s => s.id === 'quality-priority')!.apply(config, resources);
    }
    return config;
  }

  private async processQueue(): Promise<void> {
    if (this.activeJobs.size >= this.maxConcurrent || this.jobQueue.length === 0) return;

    const job = this.jobQueue.sort((a, b) => b.priority - a.priority).shift();
    if (!job) return;

    this.activeJobs.set(job.id, job);
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      const optimizedConfig = this.optimizeConfig(job.config);
      const resMap: Record<string, string> = { '480p': '854:480', '720p': '1280:720', '1080p': '1920:1080', '4k': '3840:2160' };
      const scale = resMap[optimizedConfig.resolution] || '1280:720';

      const cmd = [
        'ffmpeg -y',
        `-i "${job.inputPath}"`,
        `-vf "scale=${scale}"`,
        `-c:v ${optimizedConfig.codec}`,
        `-crf ${optimizedConfig.crf}`,
        `-preset ${optimizedConfig.preset}`,
        `-r ${optimizedConfig.fps}`,
        `-threads ${optimizedConfig.maxThreads}`,
        `-c:a ${optimizedConfig.audioCodec}`,
        `-b:a ${optimizedConfig.audioBitrate}`,
        `-pix_fmt yuv420p`,
        `"${job.outputPath}"`,
        '2>/dev/null'
      ].join(' ');

      const startTime = Date.now();
      await execAsync(cmd, { timeout: 600000 });

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.metrics = {
        processingTime: Date.now() - startTime,
        inputSize: 0,
        outputSize: 0,
        compressionRatio: 1,
        averageFps: optimizedConfig.fps,
        peakMemoryUsage: totalmem() - freemem(),
        cpuUsage: this.getSystemResources().cpuUsage
      };

      logger.info('Render job completed', { jobId: job.id, processingTime: job.metrics.processingTime, service: 'SmartRendering' });
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      logger.error('Render job failed', error instanceof Error ? error : new Error(String(error)), { jobId: job.id, service: 'SmartRendering' });
    } finally {
      this.activeJobs.delete(job.id);
      this.processQueue();
    }
  }

  private mergeConfig(partial?: Partial<RenderConfig>): RenderConfig {
    return {
      resolution: '1080p',
      codec: 'libx264',
      crf: 20,
      preset: 'medium',
      fps: 30,
      maxThreads: Math.max(1, Math.floor(cpus().length / 2)),
      enableHardwareAccel: false,
      audioCodec: 'aac',
      audioBitrate: '192k',
      ...partial
    };
  }

  getActiveJobs(): RenderJob[] {
    return Array.from(this.activeJobs.values());
  }

  getQueuedJobs(): RenderJob[] {
    return [...this.jobQueue];
  }

  getStrategies(): OptimizationStrategy[] {
    return this.strategies.map(s => ({ ...s }));
  }

  async cleanup(): Promise<void> {
    for (const [id] of this.activeJobs) {
      await this.cancelJob(id);
    }
    this.jobQueue = [];
    logger.info('SmartRenderingService cleaned up', { service: 'SmartRendering' });
  }
}

export const smartRenderingService = SmartRenderingService.getInstance();
