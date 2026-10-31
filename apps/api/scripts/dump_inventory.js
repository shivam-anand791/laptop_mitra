const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      compareAtPrice: true,
      leasePriceMonthly: true,
      bulkSellPrice: true,
      bulkLeasePrice: true,
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          compareAtPrice: true,
          leasePriceMonthly: true,
          stock: true,
          isDefault: true,
          attributes: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const fs = require('fs');
  fs.writeFileSync('c:/vloume d/laptopmitra/apps/api/scripts/products_dump.json', JSON.stringify(products, null, 2));
  console.log('Saved dump with', products.length, 'products');
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

