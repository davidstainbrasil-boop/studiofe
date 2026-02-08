
import { logger } from '@/lib/logger';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        logger.info('Checking users table for lastLogin field...');
        const user = await prisma.users.findFirst({
            select: { id: true, createdAt: true, updatedAt: true }
        });
        logger.info('User sample:', user);
    } catch (e) {
        logger.error('Error querying users:', e);
    } finally {
        await prisma.$disconnect();
    }
}
check();
