"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ProductService = class ProductService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(filters) {
        const where = {};
        if (filters?.categoryId) {
            where.categoryId = filters.categoryId;
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search } },
                { description: { contains: filters.search } },
                { shortDescription: { contains: filters.search } },
                { sku: { contains: filters.search } },
            ];
        }
        if (filters?.tags && filters.tags.length > 0) {
            where.OR = where.OR || [];
            for (const tag of filters.tags) {
                where.OR.push({
                    tags: { contains: tag, mode: 'insensitive' },
                });
            }
        }
        if (filters?.featured !== undefined) {
            where.isFeatured = filters.featured;
        }
        if (filters?.newArrival !== undefined) {
            where.isNewArrival = filters.newArrival;
        }
        if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
            where.price = {};
            if (filters?.minPrice !== undefined)
                where.price.gte = filters.minPrice;
            if (filters?.maxPrice !== undefined)
                where.price.lte = filters.maxPrice;
        }
        if (filters?.stockOnly) {
            where.stock = { gt: 0 };
        }
        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                take: filters?.limit ?? 50,
                skip: filters?.offset ?? 0,
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
    async findOne(id, includeRelations = []) {
        const include = {};
        if (includeRelations.includes('category')) {
            include.category = true;
        }
        if (includeRelations.includes('images')) {
            include.images = true;
        }
        if (includeRelations.includes('reviews')) {
        }
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: Object.keys(include).length > 0 ? include : { category: true, images: true },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with id ${id} not found`);
        }
        return product;
    }
    async create(data) {
        if (data.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: data.categoryId },
            });
            if (!category) {
                throw new common_1.NotFoundException(`Category with id ${data.categoryId} not found`);
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
    async update(id, data) {
        const existing = await this.prisma.product.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Product with id ${id} not found`);
        }
        if (data.categoryId && data.categoryId !== existing.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: data.categoryId },
            });
            if (!category) {
                throw new common_1.NotFoundException(`Category with id ${data.categoryId} not found`);
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
    async remove(id) {
        const existing = await this.prisma.product.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Product with id ${id} not found`);
        }
        await this.prisma.productImage.deleteMany({ where: { productId: id } });
        await this.prisma.product.delete({ where: { id } });
        return { message: 'Product deleted successfully' };
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductService);
//# sourceMappingURL=product.service.js.map