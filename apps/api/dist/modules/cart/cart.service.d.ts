import { PrismaService } from '../../prisma/prisma.service';
import { ProductService } from '../product/product.service';
export declare class CartService {
    private prisma;
    private productService;
    constructor(prisma: PrismaService, productService: ProductService);
    getOrCreateCart(userId: string): Promise<{
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
    }>;
    addItem(userId: string, productId: string, quantity?: number): Promise<{
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
        quantity: number;
        priceAtAdd: import("@prisma/client/runtime/library").Decimal;
        productId: string;
        cartId: string;
    }>;
    removeItem(userId: string, itemId: string): Promise<void>;
    updateQuantity(userId: string, itemId: string, quantity: number): Promise<{
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
        quantity: number;
        priceAtAdd: import("@prisma/client/runtime/library").Decimal;
        productId: string;
        cartId: string;
    }>;
    clearCart(userId: string): Promise<void>;
    getCart(userId: string): Promise<{
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
}
