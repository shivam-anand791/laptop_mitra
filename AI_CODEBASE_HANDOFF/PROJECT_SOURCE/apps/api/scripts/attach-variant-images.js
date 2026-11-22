const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function attachVariantImages() {
  const variantsWithoutImages = await prisma.productVariant.findMany({
    where: { images: { none: {} } },
    include: { product: { include: { images: true } } }
  });

  console.log(`Found ${variantsWithoutImages.length} variants without images.`);
  for (const v of variantsWithoutImages) {
    const primaryImg = v.product.images.find(img => img.isPrimary) || v.product.images[0];
    if (primaryImg) {
      await prisma.productVariantImage.create({
        data: {
          variantId: v.id,
          url: primaryImg.url,
          altText: v.name,
          isPrimary: true,
          sortOrder: 0
        }
      });
      console.log(`Attached image to variant: ${v.sku} (${v.name})`);
    }
  }

  await prisma.$disconnect();
  console.log('Finished attaching variant images.');
}

attachVariantImages().catch(err => {
  console.error(err);
  process.exit(1);
});

