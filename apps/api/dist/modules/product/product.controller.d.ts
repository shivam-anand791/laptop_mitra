import { ProductService } from './product.service';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    findAll(filters: any): Promise<import("../../types").ProductListResponse>;
    findOne(id: string, include?: string): Promise<import("../../types").Product>;
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
