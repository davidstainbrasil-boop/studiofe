
import { prisma } from '../../lib/prisma';

async function main() {
  const email = 'test_user_jetski_001@gmail.com';
  console.log(`Deleting user: ${email}`);
  
  try {
    const deleted = await prisma.users.delete({
      where: { email }
    });
    console.log('User deleted successfully:', deleted.email);
  } catch (e: any) {
    if (e.code === 'P2025') {
      console.log('User not found to delete.');
    } else {
      console.error('Error deleting user:', e);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
