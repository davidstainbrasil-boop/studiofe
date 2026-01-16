
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Project Versioning...');

  const userId = 'test-user-versioning'; // Dummy ID for safety, might fail FK if not exists
  // Ideally we should pick an existing user or create one, but for this quick test let's see.
  // 0. Find a valid auth user
  const user = await prisma.auth_users.findFirst();
  
  if (!user) {
    console.error('❌ No auth_users found in DB.');
    process.exit(1);
  }

  console.log(`👤 Using auth_user: ${user.id}`);

  // 1. Create Project (Initial Save)
  console.log('1️⃣ Creating project...');
  const newProject = await prisma.projects.create({
    data: {
      userId: user.id,
      name: 'Versioning Test Project',
      metadata: { studioSnapshot: { test: 'v1' } }
    }
  });
  console.log(`✅ Project created: ${newProject.id}`);

  // 2. Simulate Save V1 (Create Version)
  console.log('2️⃣ Creating Version 1...');
  const v1 = await prisma.project_versions.create({
    data: {
      projectId: newProject.id,
      versionNumber: '1.0.1',
      name: 'Test Version 1',
      createdBy: user.id,
      metadata: { snapshot: { test: 'v1' } }
    }
  });
  console.log(`✅ Version 1 created: ${v1.versionNumber}`);

  // 3. Simulate Save V2 (Create Version)
  console.log('3️⃣ Creating Version 2...');
  const v2 = await prisma.project_versions.create({
    data: {
      projectId: newProject.id,
      versionNumber: '1.0.2',
      name: 'Test Version 2',
      createdBy: user.id,
      metadata: { snapshot: { test: 'v2' } }
    }
  });
  console.log(`✅ Version 2 created: ${v2.versionNumber}`);

  // 4. Verify Count
  const count = await prisma.project_versions.count({
    where: { projectId: newProject.id }
  });
  console.log(`📊 Total versions for project: ${count}`);

  if (count === 2) {
    console.log('✅ SUCCESS: Versioning logic (DB level) works.');
  } else {
    console.error(`❌ FAILURE: Expected 2 versions, found ${count}`);
  }

  // Cleanup
  console.log('🧹 Cleaning up...');
  await prisma.project_versions.deleteMany({ where: { projectId: newProject.id } });
  await prisma.projects.delete({ where: { id: newProject.id } });
  console.log('✅ Cleanup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
