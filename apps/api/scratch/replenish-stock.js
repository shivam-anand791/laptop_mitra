const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.product.updateMany({
    data: { stock: 25 }
  });
  await prisma.productVariant.updateMany({
    data: { stock: 15 }
  });
  console.log('Stock replenished to 25 for all products and 15 for all variants in dev db.');
}
main().catch(console.error).finally(() => prisma.$disconnect());

