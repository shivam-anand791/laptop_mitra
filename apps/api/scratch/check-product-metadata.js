const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    take: 5,
    include: { variants: true, rentalPrices: true }
  });
  for (const p of products) {
    console.log(`Product: ${p.name} (id: ${p.id})`);
    console.log('  price:', p.price, 'compareAtPrice:', p.compareAtPrice, 'leasePriceMonthly:', p.leasePriceMonthly);
    console.log('  metadata:', p.metadata);
    console.log('  variants:', p.variants.length);
    console.log('  rentalPrices:', p.rentalPrices.length);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

