import { PrismaService } from '../../prisma/prisma.service';
export declare class ProductService {
    private prisma;
    constructor(prisma: PrismaService);
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
    }): Promise<{
        products: ({
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
            description: string | null;
            name: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            tags: string | null;
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
        })[];
        total: number;
    }>;
    findOne(id: string, includeRelations?: string[]): Promise<{
        [x: string]: {
            id: string;
            createdAt: Date;
            productId: string;
            url: string;
            altText: string | null;
            isPrimary: boolean;
            sortOrder: number;
        }[] | ({
            id: string;
            createdAt: Date;
            productId: string;
            url: string;
            altText: string | null;
            isPrimary: boolean;
            sortOrder: number;
        } | {
            id: string;
            createdAt: Date;
            productId: string;
            url: string;
            altText: string | null;
            isPrimary: boolean;
            sortOrder: number;
        })[] | ({
            id: string;
            createdAt: Date;
            quantity: number;
            priceAtAdd: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            cartId: string;
        } | {
            id: string;
            createdAt: Date;
            quantity: number;
            priceAtAdd: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            cartId: string;
        })[] | ({
            id: string;
            createdAt: Date;
            quantity: number;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
        } | {
            id: string;
            createdAt: Date;
            quantity: number;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
        })[] | ({
            id: string;
            createdAt: Date;
            productId: string;
            wishlistId: string;
        } | {
            id: string;
            createdAt: Date;
            productId: string;
            wishlistId: string;
        })[] | {
            id: string;
            createdAt: Date;
            quantity: number;
            priceAtAdd: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            cartId: string;
        }[] | {
            id: string;
            createdAt: Date;
            quantity: number;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
        }[] | {
            id: string;
            createdAt: Date;
            productId: string;
            wishlistId: string;
        }[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
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
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
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
        description: string | null;
        name: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
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
