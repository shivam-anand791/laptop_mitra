import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: any): Promise<{
        address: string;
        name: string;
        phone: string;
        id: string;
        email: string;
        referralCode: string;
        role: string;
        status: string;
        imageUrl: string;
        city: string;
        state: string;
        pincode: string;
        gender: string;
        dob: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(user: any, updateProfileDto: UpdateProfileDto): Promise<{
        address: string;
        name: string;
        phone: string;
        id: string;
        email: string;
        referralCode: string;
        city: string;
        state: string;
        pincode: string;
        gender: string;
        dob: Date;
        createdAt: Date;
    }>;
    updateAddress(user: any, updateAddressDto: UpdateAddressDto): Promise<{
        address: string;
        name: string;
        phone: string;
        id: string;
        email: string;
        referralCode: string;
        city: string;
        state: string;
        pincode: string;
        createdAt: Date;
    }>;
    getStats(user: any): Promise<{
        cartItems: number;
        wishlistItems: number;
        orders: number;
    }>;
    getUserById(id: string): Promise<{
        address: string;
        name: string;
        phone: string;
        id: string;
        email: string;
        referralCode: string;
        role: string;
        status: string;
        imageUrl: string;
        city: string;
        state: string;
        pincode: string;
        gender: string;
        dob: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
