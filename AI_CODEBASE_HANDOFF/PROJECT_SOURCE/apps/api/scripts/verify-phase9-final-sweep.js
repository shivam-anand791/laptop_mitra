const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFinalSweep() {
  console.log('=== PHASE 9: FINAL QUALITY ASSURANCE & REGRESSION SWEEP ===\n');

  let passed = 0;
  let total = 0;
  function check(cond, msg) {
    total++;
    if (cond) {
      console.log('  [PASS] ' + msg);
      passed++;
    } else {
      console.error('  [FAIL] ' + msg);
      throw new Error('Check failed: ' + msg);
    }
  }

  // 1. ACTIVE PRODUCTS & VARIANTS INTEGRITY
  console.log('1. Auditing Catalog Completeness & Variant Integrity...');
  const activeProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      variants: {
        where: { isActive: true },
        include: { images: true },
        orderBy: { isDefault: 'desc' },
      },
      images: true,
      category: true,
    },
    orderBy: { name: 'asc' },
  });

  check(activeProducts.length === 10, 'Total active products in database is exactly 10');

  let totalVariants = 0;
  let totalVariantImages = 0;
  let totalPhysicalStock = 0;

  for (const prod of activeProducts) {
    check(prod.variants.length >= 2, `Product "${prod.name}" has >= 2 variants (Actual: ${prod.variants.length})`);
    totalVariants += prod.variants.length;

    const defaultVariant = prod.variants.find(v => v.isDefault);
    check(!!defaultVariant, `Product "${prod.name}" has a designated default variant`);
    check(Number(prod.price) === Number(defaultVariant.price), `Product price ₹${prod.price} matches default variant price ₹${defaultVariant.price}`);
    check(prod.sku === defaultVariant.sku, `Product SKU ${prod.sku} matches default variant SKU ${defaultVariant.sku}`);
    check(prod.stock === defaultVariant.stock, `Product stock ${prod.stock} matches default variant stock ${defaultVariant.stock}`);

    for (const v of prod.variants) {
      check(v.sku.length > 5, `Variant SKU valid: ${v.sku}`);
      check(Number(v.price) > 0, `Variant price positive: ₹${v.price}`);
      check(Number(v.compareAtPrice) > Number(v.price), `Variant compareAtPrice (₹${v.compareAtPrice}) > price (₹${v.price})`);
      check(v.stock >= 0, `Variant stock non-negative: ${v.stock}`);
      check(v.images.length > 0, `Variant ${v.sku} has at least 1 image (Actual: ${v.images.length})`);
      totalVariantImages += v.images.length;
      totalPhysicalStock += v.stock;
    }
  }

  check(totalVariants === 28, `Total active catalog variants across all 10 products is exactly 28 (Actual: ${totalVariants})`);
  check(totalVariantImages >= 28, `Total variant images is >= 28 (Actual: ${totalVariantImages})`);
  console.log(`  => Catalog Audit: 10 Products, 28 Variants, ${totalVariantImages} Images, ${totalPhysicalStock} Physical Units in Stock.\n`);

  // 2. CHECK DELHI MARKET PRICING SANITY
  console.log('2. Auditing Delhi Refurbished Market Pricing Tiers...');
  for (const prod of activeProducts) {
    for (const v of prod.variants) {
      const p = Number(v.price);
      // Ensure pricing is realistic for refurbished laptops in India (between ₹25,000 and ₹2,50,000)
      check(p >= 25000 && p <= 250000, `Variant ${v.sku} price ₹${p.toLocaleString('en-IN')} within Delhi market range (₹25k - ₹2.5L)`);
    }
  }
  console.log('  => All 28 variants have valid Delhi refurbished market price calibration.\n');

  // 3. CHECK ADMIN ACCOUNTS & ROLE PERMISSIONS
  console.log('3. Auditing User Roles & Admin Privileges...');
  const adminAccount = await prisma.user.findUnique({
    where: { email: 'admin@xpertnote.com' },
  });
  check(!!adminAccount, 'Authenticated account admin@xpertnote.com exists');
  check(adminAccount.role === 'ADMIN', 'admin@xpertnote.com role is strictly ADMIN');

  const allRoles = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true },
  });
  console.log('  Role distribution in database:', allRoles.map(r => `${r.role}: ${r._count.id}`).join(', '));
  check(allRoles.some(r => r.role === 'ADMIN'), 'At least one ADMIN role confirmed');

  console.log('\n=== PHASE 9 FINAL SWEEP: ALL ' + passed + '/' + total + ' CHECKS PASSED SUCCESSFULLY ===');
  await prisma.$disconnect();
  process.exit(0);
}

runFinalSweep().catch(err => {
  console.error('Final Sweep Failed:', err);
  prisma.$disconnect();
  process.exit(1);
});

