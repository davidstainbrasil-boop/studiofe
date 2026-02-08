
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

async function main() {
  try {
    logger.info('Connecting to Prisma...');
    const project = await prisma.projects.findFirst();
    
    if (project) {
        logger.info('Successfully found a project:', project.id);
        logger.info('Project type:', project.type);
    } else {
        logger.info('No projects found in database.');
    }
    
    // Test the specific select used in the route
    if (project) {
        logger.info('Testing specific select query...');
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
        logger.info('Query successful:', result ? 'Yes' : 'No');
    }

  } catch (error) {
    logger.error('Error reproducing issue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
