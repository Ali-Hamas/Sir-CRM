const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[MongoDB Setup] Initializing Britsync Database setup...');
  try {
    await prisma.$connect();
    console.log('[MongoDB Setup] Successfully connected to MongoDB via Prisma Client.');
    const userCount = await prisma.user.count();
    console.log(`[MongoDB Setup] Database contains ${userCount} existing users.`);
  } catch (error) {
    console.error('[MongoDB Setup] Connection warning:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
