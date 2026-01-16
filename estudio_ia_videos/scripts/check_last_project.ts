
import { prisma } from '../src/lib/prisma';

async function checkLastProject() {
  try {
    const project = await prisma.projects.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
         // Assuming relation might not be in prisma but we can check the record
      }
    });

    if (!project) {
        console.log('No projects found.');
        return;
    }

    console.log('Last Project:', JSON.stringify(project, null, 2));

    // Check slides via raw query if relation not defined in prisma schema for 'slides' 
    // (since I saw supabase client used for slides insert in upload route)
    // or try using prisma if it has the model.
    // 'database.types.ts' had slides, but unique prisma schema might be different.
    // Let's try raw query for slides to be safe/sure.
    const slides = await prisma.$queryRaw`SELECT * FROM slides WHERE "projectId" = ${project.id} ORDER BY order_index ASC`;
    console.log(`Found ${Array.isArray(slides) ? slides.length : 0} slides for project ${project.id}`);
    if (Array.isArray(slides) && slides.length > 0) {
        console.log('First Slide:', slides[0]);
    }

  } catch (error) {
    console.error('Error checking project:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLastProject();
