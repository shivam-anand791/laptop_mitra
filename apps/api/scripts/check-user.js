const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:postgres@127.0.0.1:5432/laptopmitra_dev_fresh' },
  },
});

async function run() {
  const user = await prisma.user.findFirst({ where: { email: 'demo@gmail.com' } });
  console.log('User found:', user);
  const cart = user ? await prisma.cart.findFirst({ where: { userId: user.id }, include: { items: true } }) : null;
  console.log('Cart found:', cart);
  await prisma.$disconnect();
}
run();

