
import { logger } from '@/lib/logger';
import { prisma } from '../../lib/prisma';

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL não definida. Configure a variável de ambiente antes de executar check_user.ts'
    );
  }

  const email = 'test_user_jetski_001@gmail.com';
  logger.info(`Checking user: ${email}`);
  
  const user = await prisma.users.findUnique({
    where: { email }
  });

  if (user) {
    logger.info('User found in public.users:');
    logger.info(JSON.stringify(user, null, 2));
  } else {
    logger.info('User NOT found in public.users');
    // List some users to see if DB is empty
    const count = await prisma.users.count();
    logger.info(`Total users in public DB: ${count}`);
  }
}

main()
  .catch(e => logger.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
