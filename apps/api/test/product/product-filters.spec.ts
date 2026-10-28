import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../../src/modules/product/product.controller';
import { ProductService } from '../../src/modules/product/product.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Product Filters (SCH-02) - Dynamic Facets Extraction', () => {
  let controller: ProductController;
  let service: ProductService;
  let prismaMock: any;

  const mockActiveProducts = [
    {
      id: 'prod-1',
      name: 'Apple MacBook Pro 14" M2 Pro 16GB 512GB SSD',
      slug: 'apple-macbook-pro-14-m2',
      price: 135000,
      stock: 10,
      status: 'ACTIVE',
      metadata: {
        brand: 'Apple',
        processor: 'Apple M2 Pro',
        ram: '16GB',
        storage: '512GB SSD',
        condition: 'Grade A+ Pristine',
      },
      category: {
        id: 'cat-macbooks',
        name: 'Apple MacBooks',
        slug: 'macbooks',
      },
    },
    {
      id: 'prod-2',
      name: 'Lenovo ThinkPad X1 Carbon Gen 10 Core i7 16GB 1TB SSD',
      slug: 'lenovo-thinkpad-x1-carbon-gen-10',
      price: 68000,
      stock: 5,
      status: 'ACTIVE',
      metadata: {
        brand: 'Lenovo',
        processor: 'Intel Core i7',
        ram: '16GB DDR5',
        storage: '1TB NVMe SSD',
        condition: 'Grade A',
      },
      category: {
        id: 'cat-business',
        name: 'Business Laptops',
        slug: 'business',
      },
    },
    {
      id: 'prod-3',
      name: 'Dell Latitude 7420 Core i5 8GB 256GB SSD',
      slug: 'dell-latitude-7420-core-i5',
      price: 32000,
      stock: 12,
      status: 'ACTIVE',
      metadata: {
        brand: 'Dell',
        processor: 'Intel Core i5',
        ram: '8GB',
        storage: '256GB SSD',
        condition: 'Grade B Value',
      },
      category: {
        id: 'cat-business',
        name: 'Business Laptops',
        slug: 'business',
      },
    },
  ];

  beforeEach(async () => {
    prismaMock = {
      product: {
        findMany: jest.fn().mockResolvedValue(mockActiveProducts),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        ProductService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
  });

  describe('ProductService.getFilterFacets()', () => {
    it('returns distinct extracted facets from active products', async () => {
      const facets = await service.getFilterFacets();

      expect(facets).toBeDefined();
      expect(facets.totalCount).toBe(3);

      // Brands
      expect(facets.brands).toEqual(expect.arrayContaining(['Apple', 'Dell', 'Lenovo']));
      expect(facets.counts.brands['Apple']).toBe(1);
      expect(facets.counts.brands['Lenovo']).toBe(1);
      expect(facets.counts.brands['Dell']).toBe(1);

      // Processors
      expect(facets.processors).toEqual(expect.arrayContaining(['Apple M-Series', 'Intel Core i7', 'Intel Core i5']));

      // RAM
      expect(facets.ramOptions).toEqual(['8GB', '16GB']);
      expect(facets.counts.ram['16GB']).toBe(2);
      expect(facets.counts.ram['8GB']).toBe(1);

      // Storage
      expect(facets.storageOptions).toEqual(expect.arrayContaining(['256GB SSD', '512GB SSD', '1TB SSD']));
      expect(facets.counts.storage['512GB SSD']).toBe(1);
      expect(facets.counts.storage['1TB SSD']).toBe(1);
      expect(facets.counts.storage['256GB SSD']).toBe(1);

      // Grades
      expect(facets.grades).toEqual(expect.arrayContaining(['Grade A+ (Pristine)', 'Grade A (Excellent)', 'Grade B (Value)']));

      // Dynamic price range
      expect(facets.priceRange.min).toBe(32000);
      expect(facets.priceRange.max).toBe(135000);

      // Categories
      expect(facets.categories.length).toBe(2);
      const bizCat = facets.categories.find((c) => c.slug === 'business');
      expect(bizCat?.count).toBe(2);
    });

    it('falls back to canonical catalog if database query throws', async () => {
      prismaMock.product.findMany.mockRejectedValue(new Error('DB Connection Timeout'));

      const facets = await service.getFilterFacets();

      expect(facets).toBeDefined();
      expect(facets.brands.length).toBeGreaterThan(0);
      expect(facets.ramOptions.length).toBeGreaterThan(0);
      expect(facets.priceRange.max).toBeGreaterThan(0);
    });
  });

  describe('ProductController.getFilters()', () => {
    it('delegates GET /products/filters to service.getFilterFacets', async () => {
      const spy = jest.spyOn(service, 'getFilterFacets');
      const result = await controller.getFilters();

      expect(spy).toHaveBeenCalled();
      expect(result).toHaveProperty('brands');
      expect(result).toHaveProperty('ramOptions');
      expect(result).toHaveProperty('storageOptions');
      expect(result).toHaveProperty('priceRange');
    });
  });
});
