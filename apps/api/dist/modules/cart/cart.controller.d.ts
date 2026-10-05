import { CartService } from './cart.service';
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    getCart(user: any): Promise<{
        cart: {
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
                quantity: number;
                priceAtAdd: import("@prisma/client/runtime/library").Decimal;
                productId: string;
                cartId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
        };
        total: number;
        itemCount: number;
    }>;
    addItem(user: any, productId: string, quantity?: number): Promise<{
        cartItem: {
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
            quantity: number;
            priceAtAdd: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            cartId: string;
        };
        message: string;
    }>;
    updateQuantity(user: any, itemId: string, quantity: number): Promise<{
        cartItem: {
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
            quantity: number;
            priceAtAdd: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            cartId: string;
        };
        message: string;
    }>;
    removeItem(user: any, itemId: string): Promise<{
        message: string;
    }>;
    clearCart(user: any): Promise<{
        message: string;
    }>;
}
