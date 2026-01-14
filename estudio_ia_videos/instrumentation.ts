/**
 * Next.js Instrumentation
 * Inicialização de serviços antes do servidor iniciar
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Inicializar Sentry no servidor
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry } = await import('./src/lib/monitoring/sentry.server');
    initSentry();
  }
  
  // Inicializar Sentry no Edge Runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    const { initSentry } = await import('./src/lib/monitoring/sentry.server');
    initSentry();
  }

  // Inicializar Worker caso habilitado via variável de ambiente
  // (Evita travamentos no build do Vercel e garante separação de responsabilidades)
  if (process.env.ENABLE_WORKER === 'true' && process.env.NEXT_RUNTIME === 'nodejs') {
      const { CloudRenderingOrchestrator } = await import('./src/lib/hybrid-rendering/cloud-orchestrator');
      const { logger } = await import('./src/lib/logger');
      
      const orchestrator = new CloudRenderingOrchestrator(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        process.env.REDIS_URL || 'redis://localhost:6379'
      );
      
      orchestrator.startWorker().catch(error => {
        logger.error(`[Instrumentation] Failed to start worker: ${error}`);
      });
  }
}
