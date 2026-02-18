/**
 * Prisma Seed Script
 * Creates initial roles, permissions, and optionally a test admin user.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *   # or via npm script:
 *   npm run db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'admin', description: 'Full system access — manage users, roles, and all projects' },
  { name: 'editor', description: 'Can create and edit projects, manage collaborators' },
  { name: 'viewer', description: 'Read-only access to shared projects and dashboards' },
];

const PERMISSIONS = [
  // Projects
  { name: 'projects.create', resource: 'projects', action: 'create' },
  { name: 'projects.read', resource: 'projects', action: 'read' },
  { name: 'projects.update', resource: 'projects', action: 'update' },
  { name: 'projects.delete', resource: 'projects', action: 'delete' },
  // Renders
  { name: 'renders.create', resource: 'renders', action: 'create' },
  { name: 'renders.read', resource: 'renders', action: 'read' },
  { name: 'renders.cancel', resource: 'renders', action: 'cancel' },
  // Users (admin)
  { name: 'users.read', resource: 'users', action: 'read' },
  { name: 'users.update', resource: 'users', action: 'update' },
  { name: 'users.delete', resource: 'users', action: 'delete' },
  // Roles (admin)
  { name: 'roles.manage', resource: 'roles', action: 'manage' },
  // Analytics
  { name: 'analytics.read', resource: 'analytics', action: 'read' },
  { name: 'analytics.admin', resource: 'analytics', action: 'admin' },
];

// Which permissions each role gets
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: PERMISSIONS.map((p) => p.name), // all
  editor: [
    'projects.create',
    'projects.read',
    'projects.update',
    'projects.delete',
    'renders.create',
    'renders.read',
    'renders.cancel',
    'analytics.read',
  ],
  viewer: ['projects.read', 'renders.read', 'analytics.read'],
};

async function main() {
  console.log('🌱 Seeding database...\n');

  // --- Permissions ---
  console.log('📋 Creating permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { resource: perm.resource, action: perm.action },
      create: perm,
    });
  }
  console.log(`   ✓ ${PERMISSIONS.length} permissions`);

  // --- Roles ---
  console.log('🎭 Creating roles...');
  for (const role of ROLES) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });

    // Assign permissions to role
    const permNames = ROLE_PERMISSIONS[role.name] || [];
    for (const permName of permNames) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: createdRole.id, permissionId: perm.id },
          },
          update: {},
          create: { roleId: createdRole.id, permissionId: perm.id },
        });
      }
    }
    console.log(`   ✓ Role "${role.name}" with ${permNames.length} permissions`);
  }

  // --- Demo data (only in development) ---
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n📦 Creating demo data (non-production)...');

    // Create a demo admin user (email matches Supabase Auth user)
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@tecnicocursos.com';
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'admin', name: 'Admin TécnicoCursos' },
      create: {
        email: adminEmail,
        name: 'Admin TécnicoCursos',
        role: 'admin',
        planTier: 'enterprise',
      },
    });
    console.log(`   ✓ Admin user: ${adminUser.email}`);

    // Assign admin role
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (adminRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
        update: {},
        create: { userId: adminUser.id, roleId: adminRole.id },
      });
      console.log('   ✓ Admin role assigned');
    }

    // Create sample projects
    const projects = [
      {
        name: 'NR-10 Segurança em Eletricidade',
        description: 'Curso completo sobre segurança em instalações e serviços com eletricidade',
        type: 'pptx' as const,
        status: 'completed' as const,
        userId: adminUser.id,
      },
      {
        name: 'NR-35 Trabalho em Altura',
        description: 'Treinamento obrigatório para trabalhos acima de 2 metros',
        type: 'pptx' as const,
        status: 'in_progress' as const,
        userId: adminUser.id,
      },
      {
        name: 'NR-12 Máquinas e Equipamentos',
        description: 'Segurança no trabalho com máquinas e equipamentos industriais',
        type: 'template' as const,
        status: 'draft' as const,
        userId: adminUser.id,
      },
    ];

    for (const proj of projects) {
      const created = await prisma.project.upsert({
        where: { id: proj.name }, // Will always create since UUID won't match
        update: {},
        create: proj,
      });

      // Create sample slides for completed project
      if (proj.status === 'completed') {
        const slideCount = 5;
        for (let i = 0; i < slideCount; i++) {
          await prisma.slide.create({
            data: {
              projectId: created.id,
              orderIndex: i,
              title: `Slide ${i + 1}: ${['Introdução', 'Conceitos', 'Riscos', 'Medidas de Controle', 'Encerramento'][i]}`,
              duration: 8,
              notes: `Notas do apresentador para o slide ${i + 1}`,
            },
          });
        }
        console.log(`   ✓ Project "${proj.name}" with ${slideCount} slides`);

        // Create sample render job
        await prisma.renderJob.create({
          data: {
            projectId: created.id,
            userId: adminUser.id,
            status: 'completed',
            progress: 100,
            startedAt: new Date(Date.now() - 300000),
            completedAt: new Date(),
          },
        });
      } else {
        console.log(`   ✓ Project "${proj.name}"`);
      }
    }

    // Create analytics events
    const eventTypes = ['project_created', 'project_viewed', 'render_started', 'render_completed', 'user_login'];
    for (const eventType of eventTypes) {
      await prisma.analyticsEvent.create({
        data: {
          userId: adminUser.id,
          eventType,
          eventData: { source: 'seed' },
        },
      });
    }
    console.log(`   ✓ ${eventTypes.length} analytics events`);

    // Create usage record
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"
    await prisma.userUsage.upsert({
      where: { userId_month: { userId: adminUser.id, month: currentMonth } },
      update: { rendersCount: 3 },
      create: {
        userId: adminUser.id,
        month: currentMonth,
        rendersCount: 3,
        storageUsedBytes: BigInt(52428800), // ~50MB
      },
    });
    console.log('   ✓ Usage record');
  }

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
