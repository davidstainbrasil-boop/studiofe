
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
    try {
        // Try to count webhooks. If table doesn't exist, it will throw.
        const count = await prisma.webhooks.count();
        console.log(`Webhooks table exists. Count: ${count}`);
        return true;
    } catch (error) {
        if (error.message.includes('relation "public.webhooks" does not exist') || error.message.includes('doesn\'t exist')) {
            console.log('Webhooks table does NOT exist.');
            return false;
        }
        console.error('Error checking tables:', error);
        return false; // Assume false or manual intervention needed
    } finally {
        await prisma.$disconnect();
    }
}

checkTables();
