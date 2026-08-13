const { execSync } = require('child_process');

try {
  console.log('Running prisma db push...');
  execSync('npx prisma db push --schema=prisma/schema.prisma', { stdio: 'inherit', cwd: __dirname });
  console.log('Running prisma generate...');
  execSync('npx prisma generate --schema=prisma/schema.prisma', { stdio: 'inherit', cwd: __dirname });
  console.log('Done!');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
