const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[MongoDB Sync] Verifying Specialized AI Agents Framework...');
  try {
    await prisma.$connect();
    const agentCount = await prisma.aIAgent.count().catch(() => 0);
    console.log(`[MongoDB Sync] AI Agents framework ready (${agentCount} agents configured).`);
  } catch (error) {
    console.error('[MongoDB Sync] Warning:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
