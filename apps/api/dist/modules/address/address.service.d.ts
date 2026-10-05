import { PrismaService } from '../../prisma/prisma.service';
import { Address } from '../../types';
export interface AddressDto {
    id?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    label?: 'Home' | 'Work' | 'Other' | string;
    gstin?: string;
    isDefault?: boolean;
}
export declare class AddressService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string): Promise<Address[]>;
    create(userId: string, data: AddressDto): Promise<Address>;
    update(userId: string, id: string, data: AddressDto): Promise<Address>;
    remove(userId: string, id: string): Promise<{
        message: string;
    }>;
    private formatAddress;
    private validateAddressPayload;
}
