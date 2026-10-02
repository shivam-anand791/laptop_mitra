import { PrismaService } from '../../prisma/prisma.service';
export declare class CategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(parentId?: string): Promise<({
        _count: {
            products: number;
        };
        subcategories: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            parentId: string | null;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        parentId: string | null;
    })[]>;
    findBySlug(slug: string): Promise<{
        _count: {
            products: number;
        };
        parent: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            parentId: string | null;
        };
        subcategories: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            parentId: string | null;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        parentId: string | null;
    }>;
    findById(id: string): Promise<{
        _count: {
            products: number;
        };
        parent: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            parentId: string | null;
        };
        subcategories: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            parentId: string | null;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        parentId: string | null;
    }>;
}
