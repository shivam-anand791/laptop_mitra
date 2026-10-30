import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Product, ProductListResponse, ProductFilterFacets } from '../../types';



// Canonical catalog repository
const CANONICAL_CATALOG: Product[] = [
  {
    id: 'prod-macbook-pro-16',
    name: 'Apple MacBook Pro 16" (M2 Pro, 16GB, 512GB SSD) - Space Gray',
    slug: 'apple-macbook-pro-16-m2-pro',
    description: 'Certified Refurbished Apple MacBook Pro 16-inch featuring the revolutionary Apple M2 Pro chip with 12-core CPU and 19-core GPU. Liquid Retina XDR display with ProMotion 120Hz, pristine aluminum unibody with zero blemishes, and battery health rated at 98%. Includes original 140W MagSafe charger and 1-Year LaptopMitra comprehensive warranty.',
    shortDescription: 'Apple M2 Pro (12-Core), 16GB Unified RAM, 512GB NVMe, 16.2" Liquid Retina XDR 120Hz.',
    price: 154999,
    compareAtPrice: 249900,
    sku: 'LM-APL-MBP16-M2',
    stock: 8,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: true,
    tags: 'apple,macbook,m2,pro,space-gray,16gb,ultrabook',
    categoryId: 'cat-apple',
    category: {
      id: 'cat-apple',
      name: 'Apple MacBooks',
      slug: 'macbooks',
      description: 'Certified pre-owned Apple Silicon MacBooks in pristine condition with 100% battery health.',
    },
    images: [
      { id: 'img-1', productId: 'prod-macbook-pro-16', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80', altText: 'MacBook Pro 16 open on desk', isPrimary: true, sortOrder: 0 },
      { id: 'img-2', productId: 'prod-macbook-pro-16', url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80', altText: 'MacBook Pro side profile', isPrimary: false, sortOrder: 1 },
      { id: 'img-3', productId: 'prod-macbook-pro-16', url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80', altText: 'MacBook Pro keyboard and trackpad', isPrimary: false, sortOrder: 2 },
    ],
    metadata: {
      brand: 'Apple',
      processor: 'Apple M2 Pro (12-Core CPU, 19-Core GPU)',
      ram: '16GB Unified Memory',
      storage: '512GB Superfast NVMe SSD',
      display: '16.2" Liquid Retina XDR (3456x2234), 120Hz ProMotion',
      graphics: 'Apple 19-Core Integrated GPU',
      condition: 'Grade A+ Pristine (Certified Like-New)',
      warranty: '1 Year LaptopMitra Replacement & Service Warranty',
      batteryHealth: '98% Original Capacity (Tested 42 Cycles)',
      os: 'macOS Sequoia Pre-installed',
    },
  },
  {
    id: 'prod-thinkpad-x1-carbon-g10',
    name: 'Lenovo ThinkPad X1 Carbon Gen 10 (Intel Core i7 12th Gen, 16GB, 512GB SSD)',
    slug: 'lenovo-thinkpad-x1-carbon-gen-10',
    description: 'The definitive business executive laptop. Ultra-light carbon-fiber chassis weighing just 1.12kg, MIL-STD 810H durability tested, legendary ergonomic ThinkPad keyboard with TrackPoint, and stunning 14" WUXGA Anti-Glare IPS display. Thoroughly sanitized, thermal repasted, and tested across our 32-point inspection checklist.',
    shortDescription: 'Intel Core i7-1260P, 16GB LPDDR5, 512GB Gen4 SSD, 14" IPS 400 nits, 1.12 kg Carbon Fiber.',
    price: 64999,
    compareAtPrice: 148000,
    sku: 'LM-LEN-X1C-G10',
    stock: 14,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: false,
    tags: 'lenovo,thinkpad,x1,carbon,i7,business,ultrabook',
    categoryId: 'cat-business',
    category: {
      id: 'cat-business',
      name: 'Business Laptops',
      slug: 'business',
      description: 'Durable, secure laptops engineered for enterprise productivity and executive mobility.',
    },
    images: [
      { id: 'img-4', productId: 'prod-thinkpad-x1-carbon-g10', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1000&q=80', altText: 'Lenovo ThinkPad X1 Carbon open front view', isPrimary: true, sortOrder: 0 },
      { id: 'img-5', productId: 'prod-thinkpad-x1-carbon-g10', url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1000&q=80', altText: 'ThinkPad keyboard and TrackPoint detail', isPrimary: false, sortOrder: 1 },
    ],
    metadata: {
      brand: 'Lenovo',
      processor: 'Intel Core i7-1260P (12 Cores, up to 4.70 GHz)',
      ram: '16GB LPDDR5 5200MHz',
      storage: '512GB PCIe NVMe Gen4 SSD',
      display: '14.0" WUXGA (1920x1200) IPS, Anti-Glare, Low Power, 400 nits',
      graphics: 'Intel Iris Xe Graphics',
      condition: 'Grade A Like-New (Zero functional or cosmetic flaws)',
      warranty: '1 Year LaptopMitra On-site/Courier Warranty',
      batteryHealth: '94% Original Capacity',
      os: 'Windows 11 Pro 64-bit Genuine',
    },
  },
  {
    id: 'prod-dell-latitude-7420',
    name: 'Dell Latitude 7420 Carbon (Intel Core i5 11th Gen, 16GB, 256GB SSD)',
    slug: 'dell-latitude-7420-carbon',
    description: 'Engineered for high-paced corporate workflows. Premium carbon fiber lid, ExpressConnect automated Wi-Fi switching, dual-pipe cooling, and intelligent battery optimization. Fully sanitized and certified across 32 hardware checks.',
    shortDescription: 'Intel Core i5-1145G7 vPro, 16GB DDR4, 256GB NVMe SSD, 14" FHD IPS ComfortView Plus.',
    price: 38999,
    compareAtPrice: 95000,
    sku: 'LM-DEL-LAT7420',
    stock: 22,
    status: 'ACTIVE',
    isFeatured: false,
    isNewArrival: true,
    tags: 'dell,latitude,i5,business,carbon,corporate',
    categoryId: 'cat-business',
    category: {
      id: 'cat-business',
      name: 'Business Laptops',
      slug: 'business',
      description: 'Durable, secure laptops engineered for enterprise productivity and executive mobility.',
    },
    images: [
      { id: 'img-6', productId: 'prod-dell-latitude-7420', url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1000&q=80', altText: 'Dell Latitude 7420 workspace setup', isPrimary: true, sortOrder: 0 },
    ],
    metadata: {
      brand: 'Dell',
      processor: 'Intel Core i5-1145G7 vPro (4 Cores, 8 Threads, up to 4.40 GHz)',
      ram: '16GB DDR4 3200MHz',
      storage: '256GB PCIe M.2 NVMe SSD',
      display: '14.0" FHD (1920x1080) Anti-Glare, Non-Touch, 400 nits, Super Low Power',
      graphics: 'Intel Iris Xe Graphics',
      condition: 'Grade A (Pristine condition with 100% test pass score)',
      warranty: '1 Year LaptopMitra Replacement Warranty',
      batteryHealth: '91% Original Capacity (Up to 9 hours runtime)',
      os: 'Windows 11 Pro Genuine',
    },
  },
  {
    id: 'prod-hp-elitebook-840-g8',
    name: 'HP EliteBook 840 G8 (Intel Core i7 11th Gen, 16GB, 512GB SSD)',
    slug: 'hp-elitebook-840-g8',
    description: 'Elegantly sculpted all-aluminum business ultrabook. Features Bang & Olufsen tuned quad speakers, HP Sure View privacy display option, spill-resistant backlit keyboard, and Whisper-quiet thermals.',
    shortDescription: 'Intel Core i7-1165G7, 16GB DDR4, 512GB PCIe SSD, 14" FHD IPS Anti-Glare 400 nits.',
    price: 46999,
    compareAtPrice: 118000,
    sku: 'LM-HP-EB840G8',
    stock: 11,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: false,
    tags: 'hp,elitebook,i7,aluminum,business,audiophile',
    categoryId: 'cat-business',
    category: {
      id: 'cat-business',
      name: 'Business Laptops',
      slug: 'business',
      description: 'Durable, secure laptops engineered for enterprise productivity and executive mobility.',
    },
    images: [
      { id: 'img-7', productId: 'prod-hp-elitebook-840-g8', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1000&q=80', altText: 'HP EliteBook 840 G8 on wooden table', isPrimary: true, sortOrder: 0 },
    ],
    metadata: {
      brand: 'HP',
      processor: 'Intel Core i7-1165G7 (up to 4.70 GHz with Intel Turbo Boost)',
      ram: '16GB DDR4-3200 SDRAM (Expandable up to 64GB)',
      storage: '512GB PCIe NVMe Value M.2 SSD',
      display: '14" diagonal FHD IPS eDP anti-glare, 400 nits, 100% sRGB',
      graphics: 'Intel Iris Xe Graphics',
      condition: 'Grade A+ Pristine (Corporate lease return, single user)',
      warranty: '1 Year LaptopMitra Warranty',
      batteryHealth: '95% Tested Capacity',
      os: 'Windows 11 Pro 64-bit Genuine',
    },
  },
  {
    id: 'prod-asus-rog-zephyrus-g14',
    name: 'ASUS ROG Zephyrus G14 (AMD Ryzen 9 5900HS, 16GB, 1TB SSD, RTX 3060 6GB)',
    slug: 'asus-rog-zephyrus-g14-ryzen9',
    description: 'Compact powerhouse for creators and gamers. Magnesium-aluminum alloy body weighing 1.6kg with AniMe Matrix LED lid display, 144Hz WQHD color-accurate screen, and desktop-class graphics performance.',
    shortDescription: 'AMD Ryzen 9 5900HS (8-Core), 16GB DDR4, 1TB NVMe, NVIDIA RTX 3060 6GB, 14" 144Hz WQHD.',
    price: 84999,
    compareAtPrice: 164990,
    sku: 'LM-ASU-ZEPH-G14',
    stock: 5,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: true,
    tags: 'asus,rog,gaming,ryzen9,rtx3060,creator,workstation',
    categoryId: 'cat-gaming',
    category: {
      id: 'cat-gaming',
      name: 'Gaming & High-Perf',
      slug: 'gaming',
      description: 'High-refresh displays and dedicated NVIDIA GPUs for gaming, rendering, and CAD.',
    },
    images: [
      { id: 'img-8', productId: 'prod-asus-rog-zephyrus-g14', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1000&q=80', altText: 'ASUS ROG Zephyrus G14 RGB Gaming Laptop', isPrimary: true, sortOrder: 0 },
    ],
    metadata: {
      brand: 'Asus',
      processor: 'AMD Ryzen 9 5900HS (8 Cores, 16 Threads, up to 4.6 GHz)',
      ram: '16GB DDR4 3200MHz Dual-Channel',
      storage: '1TB M.2 NVMe PCIe 3.0 SSD',
      display: '14" WQHD (2560x1440) 16:9 IPS-level, 120Hz, 100% DCI-P3, Pantone Validated',
      graphics: 'NVIDIA GeForce RTX 3060 (6GB GDDR6 Dedicated)',
      condition: 'Grade A+ Pristine (Zero thermal throttling, repasted with liquid metal)',
      warranty: '1 Year LaptopMitra Comprehensive Warranty',
      batteryHealth: '92% Original Capacity',
      os: 'Windows 11 Home Genuine',
    },
  },
  {
    id: 'prod-lenovo-ideapad-slim-3',
    name: 'Lenovo IdeaPad Slim 3 (Intel Core i3 11th Gen, 8GB, 256GB SSD)',
    slug: 'lenovo-ideapad-slim-3-i3',
    description: 'The ultimate budget companion for online classes, college assignments, and everyday office browsing. Crisp FHD anti-glare screen with privacy shutter webcam and Dolby Audio.',
    shortDescription: 'Intel Core i3-1115G4, 8GB DDR4, 256GB NVMe SSD, 15.6" FHD Anti-Glare, Dolby Audio.',
    price: 24999,
    compareAtPrice: 48990,
    sku: 'LM-LEN-SLIM3-I3',
    stock: 30,
    status: 'ACTIVE',
    isFeatured: false,
    isNewArrival: false,
    tags: 'lenovo,ideapad,budget,student,coding,entry-level',
    categoryId: 'cat-student',
    category: {
      id: 'cat-student',
      name: 'Student & Budget',
      slug: 'student-budget',
      description: 'Affordable, dependable laptops with high battery backup for study and coding.',
    },
    images: [
      { id: 'img-9', productId: 'prod-lenovo-ideapad-slim-3', url: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1000&q=80', altText: 'Lenovo IdeaPad Slim 3 for students', isPrimary: true, sortOrder: 0 },
    ],
    metadata: {
      brand: 'Lenovo',
      processor: 'Intel Core i3-1115G4 (up to 4.10 GHz, 6MB Cache)',
      ram: '8GB DDR4 3200MHz',
      storage: '256GB M.2 PCIe NVMe SSD',
      display: '15.6" FHD (1920x1080) TN 250 nits Anti-glare',
      graphics: 'Intel UHD Graphics',
      condition: 'Grade A (Thoroughly inspected & sanitized)',
      warranty: '1 Year LaptopMitra Service Warranty',
      batteryHealth: '96% Tested Capacity',
      os: 'Windows 11 Home Genuine',
    },
  },
];

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private prisma: PrismaService) {}

  private normalizeProduct(p: any): Product {
    const rawPrice = p.price;
    const rawCompare = p.compareAtPrice;

    const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice?.toString() || '0') || 0;
    const compareAtPrice = rawCompare !== null && rawCompare !== undefined
      ? (typeof rawCompare === 'number' ? rawCompare : parseFloat(rawCompare?.toString() || '0'))
      : null;

    /* eslint-disable-next-line no-restricted-properties */
    const assetBaseUrl = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '') || '';
    const images = (p.images || []).map((img: any) => ({
      id: img.id || `img-${Math.random()}`,
      productId: p.id,
      url: img.url.startsWith('http') || !assetBaseUrl ? img.url : `${assetBaseUrl}/${img.url.replace(/^\//, '')}`,
      altText: img.altText || p.name,
      isPrimary: !!img.isPrimary,
      sortOrder: img.sortOrder || 0,
      createdAt: img.createdAt || new Date().toISOString(),
    }));

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || null,
      shortDescription: p.shortDescription || null,
      price,
      compareAtPrice,
      leasePriceMonthly: p.leasePriceMonthly ? parseFloat(p.leasePriceMonthly.toString()) : null,
      bulkSellPrice: p.bulkSellPrice ? parseFloat(p.bulkSellPrice.toString()) : null,
      bulkLeasePrice: p.bulkLeasePrice ? parseFloat(p.bulkLeasePrice.toString()) : null,
      sku: p.sku || `LM-SKU-${p.id.slice(0, 6)}`,
      barcode: p.barcode || null,
      stock: p.stock ?? 10,
      allowBackorder: !!p.allowBackorder,
      status: p.status || 'ACTIVE',
      metadata: typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata || null,
      isFeatured: !!p.isFeatured,
      isNewArrival: !!p.isNewArrival,
      tags: p.tags || null,
      categoryId: p.categoryId || null,
      category: p.category || null,
      images,
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    };
  }

  async findAll(filters?: {
    categoryId?: string;
    search?: string;
    tags?: string[];
    featured?: boolean;
    newArrival?: boolean;
    minPrice?: number;
    maxPrice?: number;
    stockOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ProductListResponse> {
    const normalizeNumber = (value: unknown) => {
      if (value === undefined || value === null || value === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const normalizeBoolean = (value: unknown) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value === 'true';
      return undefined;
    };

    const normalizedFilters = {
      ...filters,
      featured: normalizeBoolean(filters?.featured),
      newArrival: normalizeBoolean(filters?.newArrival),
      stockOnly: normalizeBoolean(filters?.stockOnly),
      minPrice: normalizeNumber(filters?.minPrice),
      maxPrice: normalizeNumber(filters?.maxPrice),
      limit: normalizeNumber(filters?.limit) ?? 50,
      offset: normalizeNumber(filters?.offset) ?? 0,
    };

    try {
      const where: any = {};
      if (normalizedFilters.categoryId && normalizedFilters.categoryId !== 'all') {
        where.categoryId = normalizedFilters.categoryId;
      }
      if (normalizedFilters.search) {
        where.OR = [
          { name: { contains: normalizedFilters.search } },
          { description: { contains: normalizedFilters.search } },
          { shortDescription: { contains: normalizedFilters.search } },
          { sku: { contains: normalizedFilters.search } },
        ];
      }
      if (normalizedFilters.featured !== undefined) {
        where.isFeatured = normalizedFilters.featured;
      }
      if (normalizedFilters.newArrival !== undefined) {
        where.isNewArrival = normalizedFilters.newArrival;
      }
      if (normalizedFilters.minPrice !== undefined || normalizedFilters.maxPrice !== undefined) {
        where.price = {};
        if (normalizedFilters.minPrice !== undefined) where.price.gte = normalizedFilters.minPrice;
        if (normalizedFilters.maxPrice !== undefined) where.price.lte = normalizedFilters.maxPrice;
      }
      if (normalizedFilters.stockOnly) {
        where.stock = { gt: 0 };
      }

      const [dbProducts, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          take: normalizedFilters.limit,
          skip: normalizedFilters.offset,
          orderBy: { createdAt: 'desc' },
          include: { category: true, images: true },
        }),
        this.prisma.product.count({ where }),
      ]);

      if (dbProducts && dbProducts.length > 0) {
        return {
          products: dbProducts.map((p) => this.normalizeProduct(p)),
          total,
        };
      }
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Product database query returned no products; using the canonical catalog fallback.');
      }
    } catch {
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Product database query failed; using the canonical catalog fallback.');
      }
    }

    // Canonical catalog fallback
    let filtered = [...CANONICAL_CATALOG];
    if (normalizedFilters.categoryId && normalizedFilters.categoryId !== 'all') {
      filtered = filtered.filter((p) => p.categoryId === normalizedFilters.categoryId);
    }
    if (normalizedFilters.search) {
      const s = normalizedFilters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.description && p.description.toLowerCase().includes(s)) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(s)) ||
          (p.tags && p.tags.toLowerCase().includes(s)) ||
          p.sku.toLowerCase().includes(s),
      );
    }
    if (normalizedFilters.featured !== undefined) {
      filtered = filtered.filter((p) => p.isFeatured === normalizedFilters.featured);
    }
    if (normalizedFilters.newArrival !== undefined) {
      filtered = filtered.filter((p) => p.isNewArrival === normalizedFilters.newArrival);
    }
    if (normalizedFilters.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= (normalizedFilters.minPrice || 0));
    }
    if (normalizedFilters.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= (normalizedFilters.maxPrice || 0));
    }
    if (normalizedFilters.stockOnly) {
      filtered = filtered.filter((p) => p.stock > 0);
    }

    const total = filtered.length;
    const paginated = filtered.slice(
      normalizedFilters.offset,
      normalizedFilters.offset + normalizedFilters.limit,
    );

    return {
      products: paginated.map((p) => this.normalizeProduct(p)),
      total,
    };
  }

  async findOne(id: string, _includeRelations: string[] = []): Promise<Product> {
    try {
      const dbProduct = await this.prisma.product.findUnique({
        where: { id },
        include: { category: true, images: true },
      });
      if (dbProduct) {
        return this.normalizeProduct(dbProduct);
      }
    } catch {
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Product database lookup failed; using the canonical catalog fallback.');
      }
    }

    const item = CANONICAL_CATALOG.find((p) => p.id === id || p.slug === id);
    if (!item) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    if (process.env.NODE_ENV === 'development') {
      this.logger.warn(`Product "${id}" is not in the database; using the canonical catalog fallback.`);
    }
    return this.normalizeProduct(item);
  }

  async create(data: any) {
    return this.prisma.product.create({
      data,
      include: { category: true, images: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true, images: true },
    });
  }

  async remove(id: string) {
    await this.prisma.productImage.deleteMany({ where: { productId: id } });
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }

  async getFilterFacets(): Promise<ProductFilterFacets> {
    try {
      const activeProducts = await this.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: { category: true },
      });

      const productsToProcess = activeProducts.length > 0 ? activeProducts : CANONICAL_CATALOG;
      return this.extractFacetsFromProducts(productsToProcess);
    } catch {
      return this.extractFacetsFromProducts(CANONICAL_CATALOG);
    }
  }

  private extractFacetsFromProducts(products: any[]): ProductFilterFacets {
    const brandCounts: Record<string, number> = {};
    const processorCounts: Record<string, number> = {};
    const ramCounts: Record<string, number> = {};
    const storageCounts: Record<string, number> = {};
    const gradeCounts: Record<string, number> = {};
    const categoryMap = new Map<string, { id: string; name: string; slug: string; count: number }>();

    let minPrice = Infinity;
    let maxPrice = 0;

    const knownBrands = ['Apple', 'Lenovo', 'Dell', 'HP', 'ASUS', 'Acer', 'Microsoft', 'MSI', 'Samsung'];

    for (const p of products) {
      const price = typeof p.price === 'number' ? p.price : parseFloat(p.price?.toString() || '0') || 0;
      if (price > 0) {
        if (price < minPrice) minPrice = price;
        if (price > maxPrice) maxPrice = price;
      }

      const rawMeta: any = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata || {};

      // 1. Extract Brand
      let brand: string | undefined = rawMeta.brand?.trim();
      if (!brand) {
        const nameLower = p.name.toLowerCase();
        for (const b of knownBrands) {
          if (nameLower.includes(b.toLowerCase())) {
            brand = b;
            break;
          }
        }
      }
      if (brand) {
        const canonicalBrand = knownBrands.find((b) => b.toLowerCase() === brand!.toLowerCase()) || brand;
        brandCounts[canonicalBrand] = (brandCounts[canonicalBrand] || 0) + 1;
      }

      // 2. Extract Processor
      let proc: string | undefined = rawMeta.processor?.trim();
      if (!proc) {
        const nameLower = p.name.toLowerCase();
        if (nameLower.includes('m1') || nameLower.includes('m2') || nameLower.includes('m3') || nameLower.includes('m4') || nameLower.includes('apple')) proc = 'Apple M-Series';
        else if (nameLower.includes('i7') || nameLower.includes('core i7')) proc = 'Intel Core i7';
        else if (nameLower.includes('i5') || nameLower.includes('core i5')) proc = 'Intel Core i5';
        else if (nameLower.includes('i3') || nameLower.includes('core i3')) proc = 'Intel Core i3';
        else if (nameLower.includes('ryzen') || nameLower.includes('amd')) proc = 'AMD Ryzen';
      }
      if (proc) {
        let procGroup = proc;
        const pLower = proc.toLowerCase();
        if (pLower.includes('m1') || pLower.includes('m2') || pLower.includes('m3') || pLower.includes('m4') || pLower.includes('apple')) procGroup = 'Apple M-Series';
        else if (pLower.includes('i7') || pLower.includes('core i7')) procGroup = 'Intel Core i7';
        else if (pLower.includes('i5') || pLower.includes('core i5')) procGroup = 'Intel Core i5';
        else if (pLower.includes('i3') || pLower.includes('core i3')) procGroup = 'Intel Core i3';
        else if (pLower.includes('ryzen') || pLower.includes('amd')) procGroup = 'AMD Ryzen';

        processorCounts[procGroup] = (processorCounts[procGroup] || 0) + 1;
      }

      // 3. Extract RAM
      let ram: string | undefined = rawMeta.ram?.trim();
      if (!ram) {
        const match = p.name.match(/\b(4|8|16|24|32|64|128)\s*GB\b/i);
        if (match) ram = `${match[1]}GB`;
      }
      if (ram) {
        const match = ram.match(/^(\d+)\s*(gb|gigabytes)?/i);
        const normalizedRam = match ? `${match[1]}GB` : ram;
        ramCounts[normalizedRam] = (ramCounts[normalizedRam] || 0) + 1;
      }

      // 4. Extract Storage
      let storage: string | undefined = rawMeta.storage?.trim();
      if (!storage) {
        const match = p.name.match(/\b(128|256|512|1024|1TB|2TB)\s*(GB|TB)?\s*(SSD|HDD|NVMe)?\b/i);
        if (match) storage = match[0];
      }
      if (storage) {
        let normStorage = storage;
        const numMatch = storage.match(/^(\d+)\s*(gb|tb)?/i);
        if (numMatch) {
          const num = numMatch[1];
          const unit = (numMatch[2] || (parseInt(num, 10) <= 8 && storage.toLowerCase().includes('tb') ? 'TB' : 'GB')).toUpperCase();
          const isHdd = storage.toUpperCase().includes('HDD');
          normStorage = `${num}${unit} ${isHdd ? 'HDD' : 'SSD'}`;
        }
        storageCounts[normStorage] = (storageCounts[normStorage] || 0) + 1;
      }

      // 5. Extract Condition Grade
      const cond = (rawMeta.condition || p.name || '').toUpperCase();
      let grade = 'Grade B (Value)';
      if (cond.includes('A+') || cond.includes('PRISTINE') || cond.includes('SEALED')) {
        grade = 'Grade A+ (Pristine)';
      } else if (/\bA\b/.test(cond) || cond.includes('EXCELLENT') || cond.includes('LIKE-NEW')) {
        grade = 'Grade A (Excellent)';
      }
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;

      // 6. Extract Category
      if (p.category) {
        const catId = p.category.id;
        const existing = categoryMap.get(catId);
        if (existing) {
          existing.count += 1;
        } else {
          categoryMap.set(catId, {
            id: p.category.id,
            name: p.category.name,
            slug: p.category.slug,
            count: 1,
          });
        }
      }
    }

    const ramOptions = Object.keys(ramCounts).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const storageOptions = Object.keys(storageCounts).sort((a, b) => {
      const getGb = (s: string) => {
        const num = parseInt(s.replace(/\D/g, ''), 10) || 0;
        return s.toLowerCase().includes('tb') ? num * 1024 : num;
      };
      return getGb(a) - getGb(b);
    });

    const brands = Object.keys(brandCounts).sort((a, b) => a.localeCompare(b));
    const processors = Object.keys(processorCounts).sort((a, b) => a.localeCompare(b));
    const grades = Object.keys(gradeCounts);
    const categories = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
      brands,
      processors,
      ramOptions,
      storageOptions,
      grades,
      categories,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === 0 ? 200000 : maxPrice,
      },
      counts: {
        brands: brandCounts,
        processors: processorCounts,
        ram: ramCounts,
        storage: storageCounts,
        grades: gradeCounts,
      },
      totalCount: products.length,
    };
  }
}
