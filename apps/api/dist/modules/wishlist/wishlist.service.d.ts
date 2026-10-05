import { PrismaService } from '../../prisma/prisma.service';
export declare class WishlistService {
    private prisma;
    constructor(prisma: PrismaService);
    getOrCreateWishlist(userId: string): Promise<{
        items: ({
            product: {
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
            };
        } & {
            id: string;
            createdAt: Date;
            productId: string;
            wishlistId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    addItem(userId: string, productId: string): Promise<{
        product: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        productId: string;
        wishlistId: string;
    }>;
    removeItem(userId: string, itemId: string): Promise<void>;
    clearWishlist(userId: string): Promise<void>;
    getWishlist(userId: string): Promise<{
        wishlist: {
            items: ({
                product: {
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
                };
            } & {
                id: string;
                createdAt: Date;
                productId: string;
                wishlistId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
        };
        itemCount: number;
    }>;
}
