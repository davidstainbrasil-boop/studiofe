
import { prisma } from '../../lib/prisma';

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL não definida. Configure a variável de ambiente antes de executar check_user.ts'
    );
  }

  const email = 'test_user_jetski_001@gmail.com';
  console.log(`Checking user: ${email}`);
  
  const user = await prisma.users.findUnique({
    where: { email }
  });

  if (user) {
    console.log('User found in public.users:');
    console.log(JSON.stringify(user, null, 2));
  } else {
    console.log('User NOT found in public.users');
    // List some users to see if DB is empty
    const count = await prisma.users.count();
    console.log(`Total users in public DB: ${count}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
