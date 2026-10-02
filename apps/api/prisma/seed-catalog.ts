import { PrismaClient } from '@prisma/client';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../../web/lib/mock-data';

const prisma = new PrismaClient();

async function seedCatalog() {
  await prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, string>();

    for (const category of MOCK_CATEGORIES) {
      const savedCategory = await tx.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
        },
        create: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
        },
      });
      categoryIds.set(category.id, savedCategory.id);
    }

    for (const product of MOCK_PRODUCTS) {
      const categoryId = product.categoryId ? categoryIds.get(product.categoryId) : undefined;
      const data = {
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        sku: product.sku,
        stock: product.stock,
        status: product.status,
        metadata: product.metadata,
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
        tags: product.tags,
        categoryId,
      };
      const savedProduct = await tx.product.upsert({
        where: { slug: product.slug },
        update: data,
        create: { id: product.id, ...data },
      });

      for (const [sortOrder, image] of (product.images ?? []).entries()) {
        const existingImage = await tx.productImage.findFirst({
          where: { productId: savedProduct.id, url: image.url },
        });

        if (existingImage) {
          await tx.productImage.update({
            where: { id: existingImage.id },
            data: { altText: image.altText, isPrimary: image.isPrimary, sortOrder },
          });
        } else {
          await tx.productImage.create({
            data: {
              productId: savedProduct.id,
              url: image.url,
              altText: image.altText,
              isPrimary: image.isPrimary,
              sortOrder,
            },
          });
        }
      }
    }
  }, { maxWait: 10000, timeout: 60000 });

  const [categoryCount, productCount, imageCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productImage.count(),
  ]);
  console.log(`Catalog sync complete: ${categoryCount} categories, ${productCount} products, ${imageCount} images.`);
}

seedCatalog()
  .catch((error: unknown) => {
    console.error('Catalog sync failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });