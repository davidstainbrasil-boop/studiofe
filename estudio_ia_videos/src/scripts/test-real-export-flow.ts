
import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import { videoRenderWorker } from '../app/workers/video-processor';
import { Job } from 'bullmq';
import { logger } from '@lib/logger';

// Mock BullMQ Job
const createMockJob = (data: any): Job => {
  return {
    id: data.videoExportId,
    data,
    updateProgress: async (progress: number) => {
        console.log(`[MockJob] Progress: ${progress}%`);
    },
    // Add other minimal necessary methods
  } as unknown as Job;
};

async function main() {
    console.log('--- Starting Real Export Flow Simulation ---');

    // 1. Create a dummy project owner if not exists
    const user = await prisma.users.findFirst() || await prisma.users.create({
        data: {
            id: 'test-user-simulation',
            email: 'test-sim@example.com',
            name: 'Test Simulator'
        }
    });

    // 2. Create a dummy project
    const project = await prisma.projects.create({
        data: {
            id: 'test-project-sim',
            userId: user.id,
            name: 'Simulation Project',
            status: 'draft'
        }
    });

    // 3. Create dummy slides
    await prisma.slides.create({
        data: {
            id: 'slide-sim-1',
            projectId: project.id,
            orderIndex: 0,
            duration: 5,
            content: 'Hello Simulation',
            backgroundColor: 'red'
        }
    });

    console.log(`Created Project: ${project.id}`);

    // 4. Create Video Export Record (QUEUED)
    // Note: In real app, this is done by api/export-real.
    const exportJobId = 'job-sim-' + Date.now();
    await prisma.render_jobs.create({
        data: {
            id: exportJobId,
            projectId: project.id,
            userId: user.id,
            status: 'pending',
            renderSettings: {
                format: 'mp4',
                quality: 'p1080',
                fps: 30
            }
        }
    });

    console.log(`Created Export Job: ${exportJobId} (Status: QUEUED)`);

    // 5. Simulate Worker Processing
    const jobPayload = {
        videoExportId: exportJobId,
        projectId: project.id,
    };

    console.log('Invoking Worker Handler...');
    try {
        const mockJob = createMockJob(jobPayload);
        // Call handler
        const { workerHandler } = await import('../app/workers/video-processor');
        await workerHandler(mockJob);
        
        console.log('Worker Handler Finished.');

        // 6. Verify Result in DB
        const result = await prisma.render_jobs.findUnique({ where: { id: exportJobId } });
        console.log(`Final Job Status: ${result?.status}`);
        console.log(`Output URL: ${result?.outputUrl}`);
        
        if (result?.status === 'completed') {
            console.log('✅ TEST PASSED: Job completed successfully.');
        } else if (result?.status === 'failed') {
            console.log(`❌ TEST FAILED: Job failed with error: ${result.errorMessage}`);
        } else {
             console.log(`⚠️ TEST INCONCLUSIVE: Status is ${result?.status}`);
        }
        
    } catch (e) {
        console.error('Test Execution Error:', e);
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
