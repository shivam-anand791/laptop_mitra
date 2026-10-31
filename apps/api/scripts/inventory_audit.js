const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { price: 'asc' }
      },
      category: true
    },
    orderBy: { name: 'asc' }
  });

  console.log(`TOTAL ACTIVE PRODUCTS: ${products.length}`);
  let totalVariants = 0;

  for (const p of products) {
    totalVariants += p.variants.length;
    console.log(`\n======================================================`);
    console.log(`PRODUCT: ${p.name} [ID: ${p.id}, Slug: ${p.slug}]`);
    console.log(`Category: ${p.category?.name || 'N/A'} | Base Price: ₹${p.price} | CompareAt: ₹${p.compareAtPrice} | Base Monthly Lease: ₹${p.leasePriceMonthly}`);
    console.log(`Stock: ${p.stock} | Metadata: ${JSON.stringify(p.metadata)}`);
    console.log(`Variants (${p.variants.length}):`);
    for (const v of p.variants) {
      console.log(`  - SKU: ${v.sku} | ID: ${v.id} | Name: ${v.name}`);
      console.log(`    Price: ₹${v.price} | CompareAt: ₹${v.compareAtPrice} | Monthly Lease: ₹${v.leasePriceMonthly} | Stock: ${v.stock} | Default: ${v.isDefault}`);
      console.log(`    Attributes: ${JSON.stringify(v.attributes)}`);
    }
  }
  console.log(`\n======================================================`);
  console.log(`TOTAL ACTIVE VARIANTS: ${totalVariants}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
