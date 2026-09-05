import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: any): Promise<{
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        role: string;
        status: string;
        imageUrl: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        gender: string;
        dob: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(user: any, updateProfileDto: UpdateProfileDto): Promise<{
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        gender: string;
        dob: Date;
        createdAt: Date;
    }>;
    updateAddress(user: any, updateAddressDto: UpdateAddressDto): Promise<{
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        createdAt: Date;
    }>;
    changePassword(user: any, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getStats(user: any): Promise<{
        cartItems: number;
        wishlistItems: number;
        orders: number;
    }>;
    getUserById(id: string): Promise<{
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        role: string;
        status: string;
        imageUrl: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        gender: string;
        dob: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
