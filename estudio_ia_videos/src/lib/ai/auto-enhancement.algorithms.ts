/**
 * Auto-Enhancement Algorithms
 * FFmpeg-based video enhancement with quality-driven parameter selection
 */

import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, mkdir, readdir, unlink } from 'fs/promises';
import { logger } from '@lib/logger';

const execAsync = promisify(exec);

export interface EnhancementStrategy {
  id: string;
  name: string;
  description: string;
  filters: FFmpegFilter[];
  priority: number;
  conditions: StrategyCondition[];
}

export interface FFmpegFilter {
  name: string;
  params: Record<string, string | number>;
}

export interface StrategyCondition {
  metric: string;
  operator: 'lt' | 'gt' | 'eq' | 'between';
  value: number | [number, number];
}

export interface FrameAnalysis {
  brightness: number;
  contrast: number;
  sharpness: number;
  noise: number;
  saturation: number;
  colorTemperature: number;
}

export interface EnhancementPlan {
  strategies: EnhancementStrategy[];
  estimatedImprovement: number;
  filterChain: string;
  outputSettings: OutputSettings;
}

export interface OutputSettings {
  codec: string;
  crf: number;
  preset: string;
  pixelFormat: string;
  audioCodec: string;
  audioBitrate: string;
}

export interface EnhancementReport {
  input: FrameAnalysis;
  output: FrameAnalysis;
  improvements: Record<string, number>;
  appliedStrategies: string[];
  processingTime: number;
  filterChain: string;
}

export class AutoEnhancementEngine {
  private static instance: AutoEnhancementEngine;
  private strategies: EnhancementStrategy[];

  private constructor() {
    this.strategies = this.buildStrategies();
  }

  static getInstance(): AutoEnhancementEngine {
    if (!AutoEnhancementEngine.instance) {
      AutoEnhancementEngine.instance = new AutoEnhancementEngine();
    }
    return AutoEnhancementEngine.instance;
  }

  private buildStrategies(): EnhancementStrategy[] {
    return [
      {
        id: 'brightness-fix',
        name: 'Brightness Correction',
        description: 'Corrects underexposed or overexposed video',
        priority: 1,
        conditions: [{ metric: 'brightness', operator: 'lt', value: 0.35 }],
        filters: [{ name: 'eq', params: { gamma: 1.3, brightness: 0.05 } }]
      },
      {
        id: 'brightness-reduce',
        name: 'Brightness Reduction',
        description: 'Reduces overexposed video brightness',
        priority: 1,
        conditions: [{ metric: 'brightness', operator: 'gt', value: 0.75 }],
        filters: [{ name: 'eq', params: { gamma: 0.8, brightness: -0.05 } }]
      },
      {
        id: 'contrast-boost',
        name: 'Contrast Enhancement',
        description: 'Boosts low contrast footage',
        priority: 2,
        conditions: [{ metric: 'contrast', operator: 'lt', value: 0.4 }],
        filters: [{ name: 'eq', params: { contrast: 1.3 } }]
      },
      {
        id: 'denoise',
        name: 'Noise Reduction',
        description: 'Reduces video noise',
        priority: 3,
        conditions: [{ metric: 'noise', operator: 'gt', value: 0.4 }],
        filters: [{ name: 'hqdn3d', params: { luma_spatial: 4, chroma_spatial: 3, luma_tmp: 6 } }]
      },
      {
        id: 'sharpen',
        name: 'Sharpening',
        description: 'Improves image sharpness',
        priority: 4,
        conditions: [{ metric: 'sharpness', operator: 'lt', value: 0.5 }],
        filters: [{ name: 'unsharp', params: { luma_msize_x: 5, luma_msize_y: 5, luma_amount: 1.0 } }]
      },
      {
        id: 'color-fix',
        name: 'Color Balance',
        description: 'Corrects color temperature',
        priority: 5,
        conditions: [{ metric: 'saturation', operator: 'lt', value: 0.3 }],
        filters: [{ name: 'eq', params: { saturation: 1.2 } }, { name: 'colorbalance', params: { rs: 0.05, gs: -0.02, bs: -0.03 } }]
      }
    ];
  }

  async analyzeVideo(videoPath: string): Promise<FrameAnalysis> {
    try {
      const frames = await this.extractSampleFrames(videoPath, 8);
      if (frames.length === 0) return this.defaultAnalysis();

      const analyses = await Promise.all(frames.map(f => this.analyzeFrame(f)));
      return this.averageAnalyses(analyses);
    } catch (error) {
      logger.error('Video analysis failed', error instanceof Error ? error : new Error(String(error)), { service: 'AutoEnhancement' });
      return this.defaultAnalysis();
    }
  }

  async createEnhancementPlan(analysis: FrameAnalysis, targetQuality: 'balanced' | 'quality' | 'speed' = 'balanced'): Promise<EnhancementPlan> {
    const applicable = this.strategies
      .filter(s => this.matchesConditions(analysis, s.conditions))
      .sort((a, b) => a.priority - b.priority);

    const allFilters = applicable.flatMap(s => s.filters);
    const filterChain = this.buildFilterChain(allFilters);

    const presets: Record<string, OutputSettings> = {
      speed: { codec: 'libx264', crf: 23, preset: 'fast', pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '128k' },
      balanced: { codec: 'libx264', crf: 20, preset: 'medium', pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '192k' },
      quality: { codec: 'libx264', crf: 17, preset: 'slow', pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '256k' }
    };

    return {
      strategies: applicable,
      estimatedImprovement: Math.min(0.4, applicable.length * 0.1),
      filterChain,
      outputSettings: presets[targetQuality]
    };
  }

  async applyEnhancement(videoPath: string, outputPath: string, plan?: EnhancementPlan): Promise<EnhancementReport> {
    const startTime = Date.now();
    const inputAnalysis = await this.analyzeVideo(videoPath);

    if (!plan) {
      plan = await this.createEnhancementPlan(inputAnalysis);
    }

    try {
      const { outputSettings: os, filterChain } = plan;
      const vf = filterChain || 'null';
      const cmd = `ffmpeg -y -i "${videoPath}" -vf "${vf}" -c:v ${os.codec} -crf ${os.crf} -preset ${os.preset} -pix_fmt ${os.pixelFormat} -c:a ${os.audioCodec} -b:a ${os.audioBitrate} "${outputPath}" 2>/dev/null`;

      await execAsync(cmd, { timeout: 300000 });

      const outputAnalysis = await this.analyzeVideo(outputPath);
      const improvements: Record<string, number> = {
        brightness: outputAnalysis.brightness - inputAnalysis.brightness,
        contrast: outputAnalysis.contrast - inputAnalysis.contrast,
        sharpness: outputAnalysis.sharpness - inputAnalysis.sharpness,
        noise: inputAnalysis.noise - outputAnalysis.noise,
        saturation: outputAnalysis.saturation - inputAnalysis.saturation
      };

      const report: EnhancementReport = {
        input: inputAnalysis,
        output: outputAnalysis,
        improvements,
        appliedStrategies: plan.strategies.map(s => s.id),
        processingTime: Date.now() - startTime,
        filterChain: plan.filterChain
      };

      logger.info('Enhancement applied', {
        strategies: report.appliedStrategies.length,
        processingTime: report.processingTime,
        service: 'AutoEnhancement'
      });

      return report;
    } catch (error) {
      logger.error('Enhancement failed', error instanceof Error ? error : new Error(String(error)), { service: 'AutoEnhancement' });
      return {
        input: inputAnalysis,
        output: inputAnalysis,
        improvements: {},
        appliedStrategies: [],
        processingTime: Date.now() - startTime,
        filterChain: ''
      };
    }
  }

  private matchesConditions(analysis: FrameAnalysis, conditions: StrategyCondition[]): boolean {
    return conditions.every(c => {
      const val = analysis[c.metric as keyof FrameAnalysis] as number;
      if (typeof val !== 'number') return false;
      switch (c.operator) {
        case 'lt': return val < (c.value as number);
        case 'gt': return val > (c.value as number);
        case 'eq': return Math.abs(val - (c.value as number)) < 0.05;
        case 'between': {
          const [lo, hi] = c.value as [number, number];
          return val >= lo && val <= hi;
        }
        default: return false;
      }
    });
  }

  private buildFilterChain(filters: FFmpegFilter[]): string {
    if (filters.length === 0) return 'null';
    return filters.map(f => {
      const params = Object.entries(f.params).map(([k, v]) => `${k}=${v}`).join(':');
      return params ? `${f.name}=${params}` : f.name;
    }).join(',');
  }

  private async extractSampleFrames(videoPath: string, count: number): Promise<Buffer[]> {
    const tempDir = join(tmpdir(), `enhance-frames-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      await execAsync(`ffmpeg -y -i "${videoPath}" -vf "select='not(mod(n\\,30))'" -frames:v ${count} -f image2 "${tempDir}/f_%04d.jpg" 2>/dev/null`);
      const files = await readdir(tempDir);
      const jpgs = files.filter(f => f.endsWith('.jpg')).sort();
      return await Promise.all(jpgs.map(f => readFile(join(tempDir, f))));
    } catch {
      return [];
    }
  }

  private async analyzeFrame(buffer: Buffer): Promise<FrameAnalysis> {
    try {
      const stats = await sharp(buffer).stats();
      const channels = stats.channels;

      const rMean = channels[0]?.mean ?? 128;
      const gMean = channels[1]?.mean ?? 128;
      const bMean = channels[2]?.mean ?? 128;
      const rStd = channels[0]?.stdev ?? 50;
      const gStd = channels[1]?.stdev ?? 50;
      const bStd = channels[2]?.stdev ?? 50;

      const brightness = (rMean + gMean + bMean) / (3 * 255);
      const contrast = Math.min(1, (rStd + gStd + bStd) / (3 * 80));
      const sharpness = Math.min(1, (rStd + gStd + bStd) / (3 * 70));
      const maxC = Math.max(rMean, gMean, bMean);
      const minC = Math.min(rMean, gMean, bMean);
      const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
      const noise = Math.max(0, 1 - sharpness);

      // Color temperature: warm if red > blue, cool otherwise
      const colorTemperature = rMean > bMean ? 0.6 + (rMean - bMean) / 512 : 0.4 - (bMean - rMean) / 512;

      return { brightness, contrast, sharpness, noise, saturation, colorTemperature: Math.max(0, Math.min(1, colorTemperature)) };
    } catch {
      return this.defaultAnalysis();
    }
  }

  private averageAnalyses(analyses: FrameAnalysis[]): FrameAnalysis {
    if (analyses.length === 0) return this.defaultAnalysis();
    const avg = (key: keyof FrameAnalysis) =>
      analyses.reduce((s, a) => s + a[key], 0) / analyses.length;

    return {
      brightness: avg('brightness'),
      contrast: avg('contrast'),
      sharpness: avg('sharpness'),
      noise: avg('noise'),
      saturation: avg('saturation'),
      colorTemperature: avg('colorTemperature')
    };
  }

  private defaultAnalysis(): FrameAnalysis {
    return { brightness: 0.5, contrast: 0.5, sharpness: 0.5, noise: 0.3, saturation: 0.4, colorTemperature: 0.5 };
  }

  getAvailableStrategies(): EnhancementStrategy[] {
    return [...this.strategies];
  }
}

export const autoEnhancementEngine = AutoEnhancementEngine.getInstance();
