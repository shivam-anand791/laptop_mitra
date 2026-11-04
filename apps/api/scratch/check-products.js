const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      status: true,
      variants: {
        select: { id: true, name: true, price: true, stock: true, isActive: true }
      },
      rentalPrices: true,
    }
  });
  console.log('Total products:', products.length);
  for (const p of products) {
    console.log(`Product ${p.id} (${p.name}): price=${p.price}, stock=${p.stock}, status=${p.status}, variants=${p.variants.length}, rentalPrices=${p.rentalPrices.length}`);
    for (const v of p.variants) {
      console.log(`  Variant ${v.id} (${v.name}): price=${v.price}, stock=${v.stock}, active=${v.isActive}`);
    }
    for (const r of p.rentalPrices) {
      console.log(`  RentalPrice tenure=${r.tenureMonths}, monthly=${r.monthlyPrice}, status=${r.status}, variantId=${r.variantId}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());

