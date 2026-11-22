const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Approved 12-month baseline monthly lease rates (INR)
const variantLeasePricing = {
  // 1. ASUS ROG Zephyrus G14
  'LM-ROG-G14-6900-16-512': 4299,
  'LM-ROG-G14-6900-16-1TB': 4699,
  'LM-ROG-G14-6900-24-1TB': 5299,

  // 2. Apple MacBook Air 13.3" M1
  'LM-MBA-M1-8-256-GLD': 3099,
  'LM-MBA-M1-8-512-GRY': 3699,
  'LM-MBA-M1-16-512-GRY': 4299,

  // 3. Apple MacBook Pro 16" M2 Pro
  'LM-MBP16-M2P-16-512': 8999,
  'LM-MBP16-M2P-32-1TB': 10999,
  'LM-MBP16-M2P-32-2TB': 12899,

  // 4. Dell XPS 15 9520
  'LM-XPS15-9520-16-512-3050': 4499,
  'LM-XPS15-9520-32-1TB-3050TI': 5299,
  'LM-XPS15-9520-64-2TB-OLED': 6999,

  // 5. HP EliteBook 840 G8
  'LM-HP-EB840G8-I5-8-256': 1999,
  'LM-HP-EB840G8-I5-16-512': 2299,
  'LM-HP-EB840G8-I7-16-512': 2599,
  'LM-HP-EB840G8-I7-32-1TB': 2999,

  // 6. Lenovo ThinkPad X1 Carbon Gen 10
  'LM-TP-X1C10-I5-16-512': 3199,
  'LM-TP-X1C10-I7-16-512': 3699,
  'LM-TP-X1C10-I7-32-1TB': 4499,

  // 7. [QA-TEST] ASUS ROG Strix G16 (2023)
  'LM-QA-ROG-G16-01': 5999,
  'LM-QA-ROG-G16-02': 7399,

  // 8. [QA-TEST] Apple MacBook Pro 14" M3 Pro
  'LM-QA-MBP14-M3-01': 9899,
  'LM-QA-MBP14-M3-02': 12899,

  // 9. [QA-TEST] Dell XPS 13 Plus 9320
  'LM-QA-XPS13P-01': 4799,
  'LM-QA-XPS13P-02': 5699,

  // 10. [QA-TEST] Lenovo ThinkPad T14s Gen 3
  'LM-QA-TP-T14-01': 2599,
  'LM-QA-TP-T14-02': 2999,
  'LM-QA-TP-T14-03': 3699,
};

async function main() {
  console.log('Starting catalog rental pricing synchronization...');
  let updatedVariants = 0;
  let updatedProducts = 0;

  for (const [sku, leaseMonthly] of Object.entries(variantLeasePricing)) {
    const variant = await prisma.productVariant.findUnique({
      where: { sku },
      include: { product: true }
    });

    if (!variant) {
      console.warn(`Variant not found for SKU: ${sku}`);
      continue;
    }

    await prisma.productVariant.update({
      where: { sku },
      data: {
        leasePriceMonthly: leaseMonthly,
      }
    });
    updatedVariants++;
    console.log(`✓ Updated Variant ${sku} (${variant.name}) -> ₹${leaseMonthly}/mo`);

    // If default variant, also update the product-level leasePriceMonthly
    if (variant.isDefault) {
      await prisma.product.update({
        where: { id: variant.productId },
        data: {
          leasePriceMonthly: leaseMonthly,
        }
      });
      updatedProducts++;
      console.log(`  ✓ Updated Parent Product ${variant.product.name} -> ₹${leaseMonthly}/mo`);
    }
  }

  console.log(`\n==============================================`);
  console.log(`Successfully synced ${updatedVariants} variants and ${updatedProducts} parent products with approved lease prices.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

