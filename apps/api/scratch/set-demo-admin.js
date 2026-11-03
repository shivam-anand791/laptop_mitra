const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.update({
    where: { email: 'demo@gmail.com' },
    data: { role: 'ADMIN' },
  });
  console.log('Updated user role:', u.email, u.role);
}

main().finally(() => prisma.$disconnect());

