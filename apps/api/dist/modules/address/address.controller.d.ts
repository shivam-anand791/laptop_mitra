import { AddressService } from './address.service';
export declare class AddressController {
    private readonly addressService;
    constructor(addressService: AddressService);
    findAll(req: any): Promise<import("../../types").Address[]>;
    create(req: any, body: any): Promise<import("../../types").Address>;
    update(req: any, id: string, body: any): Promise<import("../../types").Address>;
    remove(req: any, id: string): Promise<{
        message: string;
    }>;
}
