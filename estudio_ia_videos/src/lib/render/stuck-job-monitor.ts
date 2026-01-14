/**
 * F2.4: Stuck Job Monitor
 * Detecta e recupera jobs travados (processing infinito)
 * 
 * PRODUCTION-READY: Deve rodar como cron job ou background task
 */

import { jobManager } from './job-manager';
import { logger } from '@lib/logger';

export interface StuckJobMonitorConfig {
  /** Threshold em minutos para considerar job stuck */
  stuckThresholdMinutes: number;
  /** Intervalo de checagem em minutos */
  checkIntervalMinutes: number;
  /** Auto-fail jobs stuck */
  autoFail: boolean;
}

export class StuckJobMonitor {
  private config: StuckJobMonitorConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: Partial<StuckJobMonitorConfig> = {}) {
    this.config = {
      stuckThresholdMinutes: config.stuckThresholdMinutes || 30,
      checkIntervalMinutes: config.checkIntervalMinutes || 5,
      autoFail: config.autoFail !== undefined ? config.autoFail : true
    };

    logger.info('StuckJobMonitor initialized', {
      component: 'StuckJobMonitor',
      config: this.config
    });
  }

  /**
   * Inicia monitoramento contínuo
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('StuckJobMonitor already running', { component: 'StuckJobMonitor' });
      return;
    }

    this.isRunning = true;

    // Executar imediatamente
    this.checkStuckJobs();

    // Agendar execuções periódicas
    this.intervalId = setInterval(
      () => this.checkStuckJobs(),
      this.config.checkIntervalMinutes * 60 * 1000
    );

    logger.info('StuckJobMonitor started', {
      component: 'StuckJobMonitor',
      intervalMinutes: this.config.checkIntervalMinutes
    });
  }

  /**
   * Para monitoramento
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;

    logger.info('StuckJobMonitor stopped', { component: 'StuckJobMonitor' });
  }

  /**
   * Verifica jobs stuck e opcionalmente os marca como failed
   */
  private async checkStuckJobs(): Promise<void> {
    try {
      logger.info('Checking for stuck jobs', {
        component: 'StuckJobMonitor',
        threshold: `${this.config.stuckThresholdMinutes}min`
      });

      const stuckJobs = await jobManager.findStuckJobs(this.config.stuckThresholdMinutes);

      if (stuckJobs.length === 0) {
        logger.info('No stuck jobs found', { component: 'StuckJobMonitor' });
        return;
      }

      logger.warn(`Found ${stuckJobs.length} stuck jobs`, {
        component: 'StuckJobMonitor',
        jobIds: stuckJobs.map(j => j.id),
        threshold: `${this.config.stuckThresholdMinutes}min`
      });

      // Auto-fail se configurado
      if (this.config.autoFail) {
        const failedCount = await jobManager.failStuckJobs(this.config.stuckThresholdMinutes);

        logger.info(`Auto-failed ${failedCount} stuck jobs`, {
          component: 'StuckJobMonitor',
          failedCount,
          totalStuck: stuckJobs.length
        });
      }
    } catch (error) {
      logger.error('Error checking stuck jobs', error instanceof Error ? error : new Error(String(error)), {
        component: 'StuckJobMonitor'
      });
    }
  }

  /**
   * Executa checagem única (útil para testes ou triggers manuais)
   */
  async runOnce(): Promise<number> {
    const stuckJobs = await jobManager.findStuckJobs(this.config.stuckThresholdMinutes);

    if (this.config.autoFail && stuckJobs.length > 0) {
      return await jobManager.failStuckJobs(this.config.stuckThresholdMinutes);
    }

    return stuckJobs.length;
  }

  /**
   * Status do monitor
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      uptime: this.isRunning && this.intervalId ? 'active' : 'stopped'
    };
  }
}

// Singleton para uso global
export const stuckJobMonitor = new StuckJobMonitor({
  stuckThresholdMinutes: parseInt(process.env.STUCK_JOB_THRESHOLD_MIN || '30'),
  checkIntervalMinutes: parseInt(process.env.STUCK_JOB_CHECK_INTERVAL_MIN || '5'),
  autoFail: process.env.STUCK_JOB_AUTO_FAIL !== 'false' // Default true
});

// Auto-start em produção (pode ser desabilitado via env)
if (process.env.NODE_ENV === 'production' && process.env.STUCK_JOB_MONITOR_ENABLED !== 'false') {
  stuckJobMonitor.start();
}
