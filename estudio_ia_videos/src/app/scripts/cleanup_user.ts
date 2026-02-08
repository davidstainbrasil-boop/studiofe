
import { logger } from '@/lib/logger';
import { prisma } from '../../lib/prisma';

async function main() {
  const email = 'test_user_jetski_001@gmail.com';
  logger.info(`Deleting user: ${email}`);
  
  try {
    const deleted = await prisma.users.delete({
      where: { email }
    });
    logger.info('User deleted successfully:', deleted.email);
  } catch (e: any) {
    if (e.code === 'P2025') {
      logger.info('User not found to delete.');
    } else {
      logger.error('Error deleting user:', e);
    }
  }
}

main()
  .catch(e => logger.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
