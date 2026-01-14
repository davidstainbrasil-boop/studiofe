// Load environment variables if not already loaded (e.g. running standalone)
import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '@lib/logger';
import { videoRenderWorker } from '../app/workers/video-processor';

// Keep the process alive and log health
logger.info('[Worker] Starting Video Render Worker...');
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    logger.error('[Worker] Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    process.exit(1);
}

setInterval(() => {
    logger.info('[Worker] Health check: Alive');
    // Optional: could check Redis connection state here
}, 60000); // Log every minute

// Handle graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`[Worker] Received ${signal}, closing worker...`);
  await videoRenderWorker.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('[Worker] Uncaught Exception', error as Error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[Worker] Unhandled Rejection', new Error(String(reason)));
});

logger.info('[Worker] Worker started successfully');
