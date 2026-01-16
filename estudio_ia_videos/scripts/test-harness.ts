
import { prisma } from '@lib/prisma';
import { RenderHarness } from '@lib/harness/render-harness';
import { randomUUID } from 'crypto';
import { parseArgs } from 'util';

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      fast: { type: 'boolean', default: false },
      'fail-render': { type: 'boolean', default: false },
      'fail-upload': { type: 'boolean', default: false },
      resume: { type: 'boolean', default: false }, // Placeholder for resume logic
    },
  });

  console.log('🧪 Testing with Render Harness...');
  console.log('Options:', values);

  const harness = new RenderHarness({
    fastMode: values.fast as boolean,
    resumeMode: values.resume as boolean,
    failRender: values['fail-render'] as boolean,
    failUpload: values['fail-upload'] as boolean
  });

  // 1. Get a valid user
  let user = await prisma.auth_users.findFirst();
  if (!user) {
    // Try to find ANY user or create mock if local dev DB is empty
     console.log('⚠️ No auth user found, looking for any user...');
     const anyUser = await prisma.users.findFirst();
     if(anyUser) {
        // Mock auth user wrapper if needed, or just use ID
        user = { id: anyUser.id } as any; 
     } else {
        console.error('❌ No user found in DB. Please run simple seed or create a user.');
        process.exit(1);
     }
  }

  // 2. Create Dummy Project
  const projectId = randomUUID();
  console.log(`Creating project ${projectId}...`);
  
  await prisma.projects.create({
    data: {
      id: projectId,
      userId: user!.id,
      name: 'Harness Test Project',
      type: 'custom',
      status: 'draft',
      metadata: { lastSavedAt: new Date().toISOString() }
    }
  });

  // 3. Create Job
  const jobId = randomUUID();
  console.log(`Creating job ${jobId}...`);
  
  await prisma.render_jobs.create({
    data: {
      id: jobId,
      projectId,
      userId: user!.id,
      status: 'pending',
      progress: 0
    }
  });

  // 4. Run Harness
  console.log('🚀 Invoking Harness...');
  
  try {
      await harness.runJob({
          id: jobId,
          projectId,
          userId: user!.id,
          slides: [
              { id: 's1', content: { text: 'Slide 1' }, duration: 5 },
              { id: 's2', content: { text: 'Slide 2' }, duration: 5 }
          ],
          config: {
              resolution: { width: 1920, height: 1080 },
              fps: 30,
              quality: 'high',
              codec: 'h264',
              format: 'mp4'
          }
      });
      console.log('✅ Harness execution finished successfully.');
  } catch (e) {
      console.log('❌ Harness execution captured failure (expected if testing faults):');
      console.error(e);
  }

  // Verification Step: Check DB Status
  const job = await prisma.render_jobs.findUnique({ where: { id: jobId } });
  console.log('📊 Final Job Status:', job?.status);
  console.log('📊 Final Job Error:', job?.errorMessage);

  // Cleanup
  console.log('🧹 Cleaning up DB...');
  await prisma.render_jobs.delete({ where: { id: jobId } });
  await prisma.projects.delete({ where: { id: projectId } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
