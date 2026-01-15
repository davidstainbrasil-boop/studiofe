
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

async function main() {
  try {
    console.log('Connecting to Prisma...');
    const project = await prisma.projects.findFirst();
    
    if (project) {
        console.log('Successfully found a project:', project.id);
        console.log('Project type:', project.type);
    } else {
        console.log('No projects found in database.');
    }
    
    // Test the specific select used in the route
    if (project) {
        console.log('Testing specific select query...');
        const result = await prisma.projects.findUnique({
            where: { id: project.id },
            select: {
                id: true,
                name: true,
                userId: true,
                metadata: true,
                updatedAt: true,
                type: true 
            }
        });
        console.log('Query successful:', result ? 'Yes' : 'No');
    }

  } catch (error) {
    console.error('Error reproducing issue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
