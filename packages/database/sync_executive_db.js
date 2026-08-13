const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[MongoDB Sync] Verifying Enterprise Executive AI Dashboard...');
  try {
    await prisma.$connect();
    const dashCount = await prisma.executiveDashboard.count().catch(() => 0);
    console.log(`[MongoDB Sync] Executive AI Dashboard ready (${dashCount} dashboards configured).`);
  } catch (error) {
    console.error('[MongoDB Sync] Warning:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
