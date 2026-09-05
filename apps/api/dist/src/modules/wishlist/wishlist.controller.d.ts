import { WishlistService } from './wishlist.service';
export declare class WishlistController {
    private readonly wishlistService;
    constructor(wishlistService: WishlistService);
    getWishlist(user: any): Promise<{
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
    addItem(user: any, productId: string): Promise<{
        wishlistItem: {
            product: {
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
            };
        } & {
            id: string;
            createdAt: Date;
            productId: string;
            wishlistId: string;
        };
        message: string;
    }>;
    removeItem(user: any, itemId: string): Promise<{
        message: string;
    }>;
    clearWishlist(user: any): Promise<{
        message: string;
    }>;
}
