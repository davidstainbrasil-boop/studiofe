
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('Checking users table for lastLogin field...');
        const user = await prisma.users.findFirst({
            select: { id: true, createdAt: true, updatedAt: true }
        });
        console.log('User sample:', user);
    } catch (e) {
        console.error('Error querying users:', e);
    } finally {
        await prisma.$disconnect();
    }
}
check();
