import { PrismaService } from '../src/prisma/prisma.service';
import { AdminService } from '../src/modules/admin/admin.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const adminService = new AdminService(prisma);

  console.log('=== Laptop Mitra Catalog Update & Variant Sync (Admin Service) ===\n');

  const catalogUpdates: Array<{ productId: string; name: string; variants: any[] }> = [
    {
      productId: 'prod-macbook-pro-16',
      name: 'Apple MacBook Pro 16" (M2 Pro, 16GB, 512GB SSD) - Space Gray',
      variants: [
        {
          name: '16GB Unified RAM / 512GB SSD / M2 Pro (12-Core)',
          sku: 'LM-MBP16-M2P-16-512',
          price: 154999,
          compareAtPrice: 249900,
          stock: 8,
          isActive: true,
          isDefault: true,
          attributes: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Apple M2 Pro (12-Core)',
            graphics: 'Apple 19-Core GPU',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80',
              altText: 'MacBook Pro 16 Space Gray',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '32GB Unified RAM / 1TB SSD / M2 Pro (12-Core)',
          sku: 'LM-MBP16-M2P-32-1TB',
          price: 189999,
          compareAtPrice: 289900,
          stock: 5,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '32GB',
            storage: '1TB SSD',
            processor: 'Apple M2 Pro (12-Core)',
            graphics: 'Apple 19-Core GPU',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80',
              altText: 'MacBook Pro 16 Space Gray 1TB',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '32GB Unified RAM / 2TB SSD / M2 Pro (12-Core)',
          sku: 'LM-MBP16-M2P-32-2TB',
          price: 219999,
          compareAtPrice: 329900,
          stock: 3,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '32GB',
            storage: '2TB SSD',
            processor: 'Apple M2 Pro (12-Core)',
            graphics: 'Apple 19-Core GPU',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80',
              altText: 'MacBook Pro 16 Space Gray 2TB',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    },
    {
      productId: 'prod-thinkpad-x1-carbon-g10',
      name: 'Lenovo ThinkPad X1 Carbon Gen 10 (Intel Core i7 12th Gen, 16GB, 512GB SSD)',
      variants: [
        {
          name: '16GB LPDDR5 / 512GB SSD / Intel Core i5-1240P',
          sku: 'LM-TP-X1C10-I5-16-512',
          price: 56999,
          compareAtPrice: 135000,
          stock: 6,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Intel Core i5-1240P',
            graphics: 'Intel Iris Xe Graphics',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1000&q=80',
              altText: 'ThinkPad X1 Carbon Gen 10 i5',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '16GB LPDDR5 / 512GB SSD / Intel Core i7-1260P',
          sku: 'LM-TP-X1C10-I7-16-512',
          price: 64999,
          compareAtPrice: 148000,
          stock: 14,
          isActive: true,
          isDefault: true,
          attributes: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Intel Core i7-1260P',
            graphics: 'Intel Iris Xe Graphics',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1000&q=80',
              altText: 'ThinkPad X1 Carbon Gen 10 i7',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '32GB LPDDR5 / 1TB SSD / Intel Core i7-1260P',
          sku: 'LM-TP-X1C10-I7-32-1TB',
          price: 79999,
          compareAtPrice: 175000,
          stock: 5,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '32GB',
            storage: '1TB SSD',
            processor: 'Intel Core i7-1260P',
            graphics: 'Intel Iris Xe Graphics',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1000&q=80',
              altText: 'ThinkPad X1 Carbon Gen 10 32GB 1TB',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    },
    {
      productId: 'prod-dell-xps-15-9520',
      name: 'Dell XPS 15 9520 (Intel Core i7 12th Gen, 32GB DDR5, 1TB SSD, RTX 3050 Ti)',
      variants: [
        {
          name: '16GB DDR5 / 512GB SSD / RTX 3050 4GB / 15.6" FHD+',
          sku: 'LM-XPS15-9520-16-512-3050',
          price: 78999,
          compareAtPrice: 145000,
          stock: 5,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Intel Core i7-12700H',
            graphics: 'NVIDIA GeForce RTX 3050 4GB',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1000&q=80',
              altText: 'Dell XPS 15 9520',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '32GB DDR5 / 1TB SSD / RTX 3050 Ti 4GB / 15.6" FHD+',
          sku: 'LM-XPS15-9520-32-1TB-3050TI',
          price: 94999,
          compareAtPrice: 185000,
          stock: 9,
          isActive: true,
          isDefault: true,
          attributes: {
            ram: '32GB',
            storage: '1TB SSD',
            processor: 'Intel Core i7-12700H',
            graphics: 'NVIDIA GeForce RTX 3050 Ti 4GB',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1000&q=80',
              altText: 'Dell XPS 15 9520 Studio Pro',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '64GB DDR5 / 2TB SSD / RTX 3050 Ti 4GB / 15.6" 3.5K OLED',
          sku: 'LM-XPS15-9520-64-2TB-OLED',
          price: 124999,
          compareAtPrice: 235000,
          stock: 3,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '64GB',
            storage: '2TB SSD',
            processor: 'Intel Core i7-12700H',
            graphics: 'NVIDIA GeForce RTX 3050 Ti 4GB',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1000&q=80',
              altText: 'Dell XPS 15 9520 OLED',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    },
    {
      productId: 'prod-asus-rog-zephyrus-g14',
      name: 'ASUS ROG Zephyrus G14 GA402RJ (Ryzen 9 6900HS, 16GB, 1TB SSD, RX 6700S)',
      variants: [
        {
          name: '16GB DDR5 / 512GB SSD / Radeon RX 6700S 8GB',
          sku: 'LM-ROG-G14-6900-16-512',
          price: 74999,
          compareAtPrice: 139990,
          stock: 4,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'AMD Ryzen 9 6900HS',
            graphics: 'AMD Radeon RX 6700S 8GB',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1000&q=80',
              altText: 'ASUS ROG Zephyrus G14',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '16GB DDR5 / 1TB SSD / Radeon RX 6700S 8GB',
          sku: 'LM-ROG-G14-6900-16-1TB',
          price: 82999,
          compareAtPrice: 159990,
          stock: 11,
          isActive: true,
          isDefault: true,
          attributes: {
            ram: '16GB',
            storage: '1TB SSD',
            processor: 'AMD Ryzen 9 6900HS',
            graphics: 'AMD Radeon RX 6700S 8GB',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1000&q=80',
              altText: 'ASUS ROG Zephyrus G14 1TB',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '24GB DDR5 / 1TB SSD / Radeon RX 6700S 8GB',
          sku: 'LM-ROG-G14-6900-24-1TB',
          price: 92999,
          compareAtPrice: 174990,
          stock: 4,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '24GB',
            storage: '1TB SSD',
            processor: 'AMD Ryzen 9 6900HS',
            graphics: 'AMD Radeon RX 6700S 8GB',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1000&q=80',
              altText: 'ASUS ROG Zephyrus G14 24GB',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    },
    {
      productId: 'prod-hp-elitebook-840-g8',
      name: 'HP EliteBook 840 G8 (Intel Core i5 11th Gen, 16GB, 256GB SSD)',
      variants: [
        {
          name: '8GB DDR4 / 256GB SSD / Intel Core i5-1135G7',
          sku: 'LM-HP-EB840G8-I5-8-256',
          price: 32999,
          compareAtPrice: 78000,
          stock: 8,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '8GB',
            storage: '256GB SSD',
            processor: 'Intel Core i5-1135G7',
            graphics: 'Intel Iris Xe Graphics',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80',
              altText: 'HP EliteBook 840 G8',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '16GB DDR4 / 512GB SSD / Intel Core i5-1135G7',
          sku: 'LM-HP-EB840G8-I5-16-512',
          price: 38999,
          compareAtPrice: 92000,
          stock: 19,
          isActive: true,
          isDefault: true,
          attributes: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Intel Core i5-1135G7',
            graphics: 'Intel Iris Xe Graphics',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80',
              altText: 'HP EliteBook 840 G8 16GB 512GB',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '16GB DDR4 / 512GB SSD / Intel Core i7-1165G7',
          sku: 'LM-HP-EB840G8-I7-16-512',
          price: 44999,
          compareAtPrice: 108000,
          stock: 6,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Intel Core i7-1165G7',
            graphics: 'Intel Iris Xe Graphics',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80',
              altText: 'HP EliteBook 840 G8 i7',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '32GB DDR4 / 1TB SSD / Intel Core i7-1165G7',
          sku: 'LM-HP-EB840G8-I7-32-1TB',
          price: 52999,
          compareAtPrice: 125000,
          stock: 4,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '32GB',
            storage: '1TB SSD',
            processor: 'Intel Core i7-1165G7',
            graphics: 'Intel Iris Xe Graphics',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80',
              altText: 'HP EliteBook 840 G8 32GB 1TB',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    },
    {
      productId: 'prod-macbook-air-m1',
      name: 'Apple MacBook Air 13.3" (M1, 8GB, 256GB SSD) - Gold',
      variants: [
        {
          name: '8GB Unified RAM / 256GB SSD / Apple 7-Core GPU',
          sku: 'LM-MBA-M1-8-256-GLD',
          price: 51999,
          compareAtPrice: 92900,
          stock: 12,
          isActive: true,
          isDefault: true,
          attributes: {
            ram: '8GB',
            storage: '256GB SSD',
            processor: 'Apple M1 (8-Core CPU)',
            graphics: 'Apple 7-Core GPU',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80',
              altText: 'MacBook Air M1 Gold',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '8GB Unified RAM / 512GB SSD / Apple 8-Core GPU',
          sku: 'LM-MBA-M1-8-512-GRY',
          price: 61999,
          compareAtPrice: 112900,
          stock: 6,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '8GB',
            storage: '512GB SSD',
            processor: 'Apple M1 (8-Core CPU)',
            graphics: 'Apple 8-Core GPU',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80',
              altText: 'MacBook Air M1 Space Gray',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        {
          name: '16GB Unified RAM / 512GB SSD / Apple 8-Core GPU',
          sku: 'LM-MBA-M1-16-512-GRY',
          price: 74999,
          compareAtPrice: 132900,
          stock: 4,
          isActive: true,
          isDefault: false,
          attributes: {
            ram: '16GB',
            storage: '512GB SSD',
            processor: 'Apple M1 (8-Core CPU)',
            graphics: 'Apple 8-Core GPU',
          },
          images: [
            {
              url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80',
              altText: 'MacBook Air M1 16GB',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    },
  ];

  for (const item of catalogUpdates) {
    console.log(`Updating and syncing variants for: ${item.name} (${item.productId})...`);
    const updated = await adminService.updateProduct(item.productId, {
      variants: item.variants,
    });
    console.log(` -> SUCCESS! Product synced. SKU: ${updated.sku}, Price: ₹${updated.price}, Stock: ${updated.stock}, Variants Count: ${updated.variants.length}`);
  }

  // Also verify all 10 products in catalog
  console.log('\n--- Catalog Verification Sweep (All Products) ---');
  const allProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { variants: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total Active Products in Catalog: ${allProducts.length}`);
  for (const p of allProducts) {
    const defaultVar = p.variants.find((v) => v.isDefault);
    console.log(`- [${p.id}] ${p.name}`);
    console.log(`   Price: ₹${p.price} | Stock: ${p.stock} | SKU: ${p.sku} | Total Variants: ${p.variants.length}`);
    if (defaultVar) {
      console.log(`   Default Variant: ${defaultVar.name} (${defaultVar.sku}) -> Price: ₹${defaultVar.price}, Stock: ${defaultVar.stock}`);
    } else {
      console.log(`   WARNING: No default variant!`);
    }
  }

  await prisma.$disconnect();
  console.log('\n=== Catalog Update & Sync Completed Successfully ===');
}

main().catch((err) => {
  console.error('Fatal Error during catalog sync:', err);
  process.exit(1);
});

