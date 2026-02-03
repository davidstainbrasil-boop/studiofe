// Instrumentation para Next.js App Router
// Executado em edge/server conforme documentação Next 13+/14.
// Responsável por marcar bootstrap e permitir inicialização futura de tracing.

// import { addBreadcrumb, ensureMonitoringReady } from './lib/services/monitoring-service';
// import { startQueueMetricsPolling } from './lib/services/bullmq-service';
// import { bullMQMetrics } from './lib/services/bullmq-metrics';
import * as Sentry from '@sentry/nextjs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { initSentry } from './lib/monitoring/sentry.server';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { warmCache } from './lib/cache/cache-warming';
import { validateEnvVarsForEnvironment } from './lib/env-validator';
// import { logger } from './lib/services/logger-service-centralized';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
        profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? '0.1'),
        enabled: !!process.env.SENTRY_DSN,
      });
  }

  // Validar variáveis de ambiente no startup (fail-fast)
  // Executa apenas no servidor (não no cliente)
  if (typeof window === 'undefined') {
    try {
      validateEnvVarsForEnvironment();
    } catch (error) {
      // Em produção, falhar imediatamente
      // Em desenvolvimento, erro já foi logado como warning
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Falha na validação de variáveis de ambiente:', error);
        throw error;
      }
    }
  }

  // TODO: Re-enable Sentry with edge-compatible configuration
  // Disabled temporarily to fix edge runtime crash causing 400 errors on static assets
  // Error: "EvalError: Code generation from strings disallowed for this context"
  // if (process.env.NODE_ENV === 'production') {
  //   initSentry();
  // }

  // Marca início da aplicação
  // addBreadcrumb('app-start', 'lifecycle');
  // await ensureMonitoringReady();

  // Sprint 5: Warm cache on server start
  if (process.env.NODE_ENV !== 'test') {
    // warmCache().catch((error: unknown) => {
    //   console.error('Cache warming failed on startup', error);
    // });
  }

  /*
  if (typeof process !== 'undefined') {
    process.on('unhandledRejection', (reason: unknown) => {
      // const error = reason instanceof Error ? reason : new Error(String(reason));
      // const context = typeof reason === 'object' && reason !== null 
      //   ? (reason as Record<string, unknown>) 
      //   : { value: reason };
      // logger.error('Process: unhandledRejection', error, context);
      // addBreadcrumb('unhandled-rejection', 'error');
      console.error('Process: unhandledRejection', reason);
    });
    process.on('uncaughtException', (err: unknown) => {
      // const error = err instanceof Error ? err : new Error(String(err));
      // logger.error('Process: uncaughtException', error);
      // addBreadcrumb('uncaught-exception', 'error');
      console.error('Process: uncaughtException', err);
    });
  }
  */

  // Inicia polling de métricas BullMQ (ajustar para somente ambiente server)
  if (process.env.NODE_ENV !== 'test') {
    // startQueueMetricsPolling(parseInt(process.env.BULLMQ_POLL_INTERVAL_MS || '30000', 10));
    // bullMQMetrics.startPolling(30000); // 30s
  }
}
