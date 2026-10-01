import { PrismaService } from '../../prisma/prisma.service';
export interface AddressDto {
    id?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    isDefault?: boolean;
}
export declare class AddressService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string): Promise<{
        address: string;
        phone: string | null;
        id: string;
        city: string | null;
        state: string | null;
        pincode: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fullName: string | null;
        landmark: string | null;
        isDefault: boolean;
    }[]>;
    create(userId: string, data: AddressDto): Promise<{
        address: string;
        phone: string | null;
        id: string;
        city: string | null;
        state: string | null;
        pincode: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fullName: string | null;
        landmark: string | null;
        isDefault: boolean;
    }>;
    update(userId: string, id: string, data: AddressDto): Promise<{
        address: string;
        phone: string | null;
        id: string;
        city: string | null;
        state: string | null;
        pincode: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fullName: string | null;
        landmark: string | null;
        isDefault: boolean;
    }>;
    remove(userId: string, id: string): Promise<{
        message: string;
    }>;
    private validateAddressPayload;
}
