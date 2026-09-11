import { AddressService } from './address.service';
export declare class AddressController {
    private readonly addressService;
    constructor(addressService: AddressService);
    findAll(req: any): Promise<{
        address: string;
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        city: string | null;
        state: string | null;
        pincode: string | null;
        fullName: string | null;
        landmark: string | null;
        isDefault: boolean;
    }[]>;
    create(req: any, body: any): Promise<{
        address: string;
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        city: string | null;
        state: string | null;
        pincode: string | null;
        fullName: string | null;
        landmark: string | null;
        isDefault: boolean;
    }>;
    update(req: any, id: string, body: any): Promise<{
        address: string;
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        city: string | null;
        state: string | null;
        pincode: string | null;
        fullName: string | null;
        landmark: string | null;
        isDefault: boolean;
    }>;
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
}
