
import { PrismaClient } from '@prisma/client';
import { addVideoJob, getVideoJobStatus } from '../lib/queue/render-queue';
import { jobManager } from '../lib/render/job-manager';
import { videoRenderWorker } from '../app/workers/video-processor';
import { logger } from '../lib/logger';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  logger.info('🧪 Starting E2E Render Test...');

  // 1. Setup User & Project
  const userId = 'test-user-e2e';
  const projectId = `test-project-${randomUUID()}`;

  // Upsert user
  await prisma.users.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: 'test-e2e@estudio.ai',
      name: 'Test E2E',
      role: 'user' // Use literal string if enum not available or matching
    }
  });

  // Create Project
  await prisma.projects.create({
    data: {
      id: projectId,
      userId: userId,
      name: 'E2E Render Test Project',
      type: 'custom',
      status: 'draft',
      metadata: {}
    }
  });

  // Create Slide (required by pipeline)
  await prisma.slides.create({
    data: {
      id: `slide-${randomUUID()}`,
      projectId: projectId,
      slideOrder: 0,
      title: 'Test Slide',
      content: 'Hello World, this is a test render.',
      durationSeconds: 5,
      layoutType: 'blank',
      background: { type: 'color', value: '#FF0000' } // Red background
    }
  });
  
  // Also add to 'slides' table if it exists as separate check from 'slides' model?
  // Pipeline uses `supabase.from('slides')` which maps to public.slides table.
  // Prisma model `slides` maps to that table.

  logger.info(`✅ Project created: ${projectId}`);

  // 1.5 Verify Data
  const slidesPrisma = await prisma.slides.findMany({ where: { projectId: projectId } });
  logger.info(`🔍 Prisma found ${slidesPrisma.length} slides for project ${projectId}`);

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: slidesSupabase, error: sbError } = await supabase.from('slides').select('*').eq('project_id', projectId);
  
  if (sbError) logger.error('❌ Supabase Error:', sbError);
  logger.info(`🔍 Supabase found ${slidesSupabase?.length || 0} slides for project ${projectId}`);

  // 2. Create Job in DB & Add to Queue
  const idempotencyKey = `idemp-${randomUUID()}`;
  const jobId = await jobManager.createJob(userId, projectId, idempotencyKey);
  logger.info(`✅ Job created in DB: ${jobId}`);
  
  // Pipeline expects slides in jobdata usually?
  // Let's check api/render/start again.
  // It calls addVideoJob with { jobId, projectId, slides, config, userId }
  
  const slidesPayload = [{
    id: `slide-1`,
    orderIndex: 0,
    title: 'Test Slide',
    content: 'Hello World',
    duration: 5,
    transition: 'fade',
    transitionDuration: 0.5
  }];

  const jobBullId = await addVideoJob({
    jobId: jobId,
    projectId: projectId,
    userId: userId,
    slides: slidesPayload,
    config: {
      width: 1280,
      height: 720,
      fps: 30,
      quality: 'medium',
      format: 'mp4',
      test: true // Important for skipping expensive steps if implemented
    }
  });

  logger.info(`✅ Job added to queue: ${jobBullId} (DB ID: ${jobId})`);

  // 3. Monitor
  // The worker is imported and thus running in this process?
  // No, importing it initializes it if it has side effects, but we might need to verify.
  // The worker in 'video-processor.ts' calls createRenderWorker which likely starts processing immediately if connected.
  
  // Wait for completion
  let attempts = 0;
  while (attempts < 30) {
    await new Promise(r => setTimeout(r, 2000));
    
    // Check BullMQ status
    const status = await getVideoJobStatus(jobBullId);
    logger.info(`Job Status: ${status.status} | Progress: ${status.progress}%`);

    if (status.status === 'completed') {
      logger.info('🎉 Render Completed Successfully!');
      logger.info('Result:', status.result);
      break;
    }

    if (status.status === 'failed') {
      logger.error('❌ Render Failed:', new Error(status.error || 'Unknown error'));
      process.exit(1);
    }
    
    attempts++;
  }

  if (attempts >= 30) {
    logger.error('❌ Timeout waiting for render');
    process.exit(1);
  }

  // Cleanup
  await videoRenderWorker.close();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
