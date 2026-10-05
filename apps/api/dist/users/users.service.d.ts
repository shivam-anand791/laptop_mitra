import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
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
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{
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
    updateAddress(userId: string, updateAddressDto: UpdateAddressDto): Promise<{
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
    getUserStats(userId: string): Promise<{
        cartItems: number;
        wishlistItems: number;
        orders: number;
    }>;
}
