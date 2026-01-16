
import { prisma } from '@lib/prisma';
import { remotionRenderer } from '@lib/render/remotion-renderer';
import { randomUUID } from 'crypto';
import path from 'path';

async function main() {
  console.log('🧪 Testing Remotion Render Worker Strategy...');

  // 1. Get a valid user
  const user = await prisma.auth_users.findFirst();
  if (!user) {
    console.error('❌ No auth user found');
    process.exit(1);
  }

  // 2. Create Dummy Project with Snapshot
  const projectId = randomUUID();
  console.log(`Creating project ${projectId}...`);
  
  await prisma.projects.create({
    data: {
      id: projectId,
      userId: user.id,
      name: 'Remotion Test Project',
      type: 'custom',
      status: 'draft',
      metadata: {
        studioSnapshot: {
          id: projectId,
          name: 'Test Project',
          duration: 5,
          layers: [
            {
              id: 'layer-1',
              name: 'Track 1',
              type: 'video',
              visible: true,
              locked: false,
              items: [
                {
                  id: 'item-1',
                  type: 'text',
                  name: 'Hello Remotion',
                  start: 0,
                  duration: 5,
                  source: 'Hello Remotion',
                  properties: {},
                  data: {
                    style: {
                      fontSize: '100px',
                      color: 'yellow',
                      backgroundColor: 'blue'
                    }
                  }
                }
              ]
            }
          ]
        },
        lastSavedAt: new Date().toISOString()
      }
    }
  });

  // 3. Create Job (Mocking DB entry)
  const jobId = randomUUID();
  console.log(`Creating job ${jobId}...`);
  
  await prisma.render_jobs.create({
    data: {
      id: jobId,
      projectId,
      userId: user.id,
      status: 'pending',
      progress: 0
    }
  });

  // 4. Run Renderer
  console.log('🚀 Invoking Remotion Renderer...');
  try {
    const outputUrl = await remotionRenderer.renderJob(jobId, projectId);
    console.log(`✅ Render Success! Output: ${outputUrl}`);
  } catch (e) {
    console.error('❌ Render Failed:', e);
  }

  // Cleanup
  console.log('🧹 Cleaning up...');
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
