const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rentalPrices = await prisma.rentalPrice.findMany({
    include: { product: true }
  });
  console.log('Total RentalPrice rows:', rentalPrices.length);
  const tenures = new Set();
  const statuses = new Set();
  for (const rp of rentalPrices) {
    tenures.add(rp.tenureMonths);
    statuses.add(rp.status);
    console.log(`Product: ${rp.product?.name || rp.productId}, Tenure: ${rp.tenureMonths}m, Monthly: ₹${rp.monthlyPrice}, Status: ${rp.status}, Source: ${rp.sourceType}`);
  }
  console.log('Unique tenures:', Array.from(tenures).sort((a,b)=>a-b));
  console.log('Unique statuses:', Array.from(statuses));
}

main().catch(console.error).finally(() => prisma.$disconnect());

