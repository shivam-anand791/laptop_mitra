const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const migrations = await prisma.$queryRawUnsafe('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 15');
  console.log(JSON.stringify(migrations, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());

