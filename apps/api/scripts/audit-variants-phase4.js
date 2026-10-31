const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { variants: { include: { images: true } } },
    orderBy: { createdAt: 'asc' }
  });
  console.log('ACTIVE PRODUCTS COUNT:', products.length);
  let totalVariants = 0;
  for (const p of products) {
    totalVariants += p.variants.length;
    console.log('\nPRODUCT:', p.id, '|', p.name);
    console.log('  Master SKU:', p.sku, '| Price: ₹' + p.price, '| CompareAt: ₹' + p.compareAtPrice, '| Stock:', p.stock);
    console.log('  Variants (' + p.variants.length + '):');
    for (const v of p.variants) {
      console.log('    - [' + v.sku + '] ' + v.name + (v.isDefault ? ' [DEFAULT]' : '') + ' | Price: ₹' + v.price + ' | CompareAt: ₹' + v.compareAtPrice + ' | Stock: ' + v.stock + ' | Images: ' + v.images.length);
      console.log('      Attrs:', JSON.stringify(v.attributes));
    }
  }
  console.log('\nTOTAL ACTIVE VARIANTS ACROSS CATALOG:', totalVariants);
  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});

