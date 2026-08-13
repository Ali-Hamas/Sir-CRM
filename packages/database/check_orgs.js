const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Organizations in Database ---');
  const orgs = await prisma.organization.findMany({ where: { isDeleted: false } });
  console.log('Organizations found:', orgs.length);
  orgs.forEach((o) => {
    console.log(` - ID: "${o.id}", Name: "${o.name}", Slug: "${o.slug}"`);
  });

  const users = await prisma.user.findMany();
  console.log('\nUsers found:', users.length);
  users.forEach((u) => {
    console.log(` - ID: "${u.id}", Email: "${u.email}", Role: "${u.role}"`);
  });
}

main().finally(() => prisma.$disconnect());
