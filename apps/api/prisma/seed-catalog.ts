import { PrismaClient } from '@prisma/client';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../../web/lib/mock-data';
import { assertSafeDatabaseTarget, loadDatabaseEnvironment } from '../src/common/database-safety';

loadDatabaseEnvironment('development');
assertSafeDatabaseTarget();
if (process.env.ALLOW_DEV_SEED !== 'true') {
  throw new Error('Refusing to seed without ALLOW_DEV_SEED=true.');
}
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

      // Delete and recreate product images inside the transaction to guarantee idempotency
      await tx.productImage.deleteMany({
        where: { productId: savedProduct.id },
      });

      if (product.images && product.images.length > 0) {
        await tx.productImage.createMany({
          data: product.images.map((image, sortOrder) => ({
            productId: savedProduct.id,
            url: image.url,
            altText: image.altText,
            isPrimary: image.isPrimary,
            sortOrder,
          })),
        });
      }
    }
  }, { maxWait: 10000, timeout: 60000 });

  for (const user of [
    { email: 'admin@example.test', firebaseUid: 'local-dev-admin', name: 'Local Admin', role: 'ADMIN', referralCode: 'LOCALADMIN' },
    { email: 'support@example.test', firebaseUid: 'local-dev-support', name: 'Local Support', role: 'SUPPORT', referralCode: 'LOCALSUPPORT' },
    { email: 'customer@example.test', firebaseUid: 'local-dev-customer', name: 'Local Customer', role: 'CUSTOMER', referralCode: 'LOCALCUSTOMER' },
  ]) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
  }

  const [categoryCount, productCount, imageCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productImage.count(),
  ]);
  console.log(`Dev seed complete: ${categoryCount} categories, ${productCount} products, ${imageCount} images, 3 example users.`);
}

seedCatalog()
  .catch((error: unknown) => {
    console.error('Catalog sync failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });