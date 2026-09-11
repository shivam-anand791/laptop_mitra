import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

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
  }) {
    const normalizeNumber = (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

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

    const where: any = {};

    if (normalizedFilters.categoryId) {
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

    if (normalizedFilters.tags && normalizedFilters.tags.length > 0) {
      where.OR = where.OR || [];
      for (const tag of normalizedFilters.tags) {
        where.OR.push({
          tags: { contains: tag, mode: 'insensitive' },
        });
      }
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

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: normalizedFilters.limit,
        skip: normalizedFilters.offset,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          images: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  async findOne(id: string, includeRelations: string[] = []) {
    const include: any = {};

    if (includeRelations.includes('category')) {
      include.category = true;
    }
    if (includeRelations.includes('images')) {
      include.images = true;
    }
    if (includeRelations.includes('reviews')) {
      // No reviews model in schema, skip
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : { category: true, images: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  async create(data: any) {
    // Check if category exists
    if (data.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with id ${data.categoryId} not found`);
      }
    }

    return await this.prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        sku: data.sku,
        barcode: data.barcode,
        stock: data.stock ?? 0,
        allowBackorder: data.allowBackorder ?? false,
        status: data.status ?? 'ACTIVE',
        metadata: data.metadata,
        isFeatured: data.isFeatured ?? false,
        isNewArrival: data.isNewArrival ?? false,
        tags: data.tags ? (Array.isArray(data.tags) ? data.tags.join(',') : data.tags) : null,
        categoryId: data.categoryId,
      },
      include: {
        category: true,
        images: true,
      },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Check if category exists when changing
    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with id ${data.categoryId} not found`);
      }
    }

    return await this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        sku: data.sku,
        barcode: data.barcode,
        stock: data.stock,
        allowBackorder: data.allowBackorder,
        status: data.status,
        metadata: data.metadata,
        isFeatured: data.isFeatured,
        isNewArrival: data.isNewArrival,
        tags: data.tags ? (Array.isArray(data.tags) ? data.tags.join(',') : data.tags) : existing.tags,
        categoryId: data.categoryId,
      },
      include: {
        category: true,
        images: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    await this.prisma.productImage.deleteMany({ where: { productId: id } });
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }
}
