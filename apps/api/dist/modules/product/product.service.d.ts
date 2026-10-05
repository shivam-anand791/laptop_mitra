import { PrismaService } from '../../prisma/prisma.service';
import { Product, ProductListResponse } from '../../types';
export declare class ProductService {
    private prisma;
    constructor(prisma: PrismaService);
    private normalizeProduct;
    findAll(filters?: {
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
    }): Promise<ProductListResponse>;
    findOne(id: string, includeRelations?: string[]): Promise<Product>;
    create(data: any): Promise<{
        category: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            parentId: string | null;
        };
        images: {
            id: string;
            createdAt: Date;
            productId: string;
            url: string;
            altText: string | null;
            isPrimary: boolean;
            sortOrder: number;
        }[];
    } & {
        tags: string | null;
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
        shortDescription: string | null;
        slug: string;
        price: import("@prisma/client/runtime/library").Decimal;
        compareAtPrice: import("@prisma/client/runtime/library").Decimal | null;
        barcode: string | null;
        stock: number;
        allowBackorder: boolean;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        isFeatured: boolean;
        isNewArrival: boolean;
        categoryId: string | null;
    }>;
    update(id: string, data: any): Promise<{
        category: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            parentId: string | null;
        };
        images: {
            id: string;
            createdAt: Date;
            productId: string;
            url: string;
            altText: string | null;
            isPrimary: boolean;
            sortOrder: number;
        }[];
    } & {
        tags: string | null;
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
        shortDescription: string | null;
        slug: string;
        price: import("@prisma/client/runtime/library").Decimal;
        compareAtPrice: import("@prisma/client/runtime/library").Decimal | null;
        barcode: string | null;
        stock: number;
        allowBackorder: boolean;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        isFeatured: boolean;
        isNewArrival: boolean;
        categoryId: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
