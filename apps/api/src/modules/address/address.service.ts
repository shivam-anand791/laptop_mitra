import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, data: AddressDto) {
    this.validateAddressPayload(data);

    const created = await this.prisma.address.create({
      data: {
        userId,
        fullName: data.fullName?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || '',
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        pincode: data.pincode?.trim() || null,
        landmark: data.landmark?.trim() || null,
        isDefault: !!data.isDefault,
      },
    });

    if (created.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: created.id } },
        data: { isDefault: false },
      });
    }

    return created;
  }

  async update(userId: string, id: string, data: AddressDto) {
    const existing = await this.prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    this.validateAddressPayload(data, { allowEmpty: true });

    const updated = await this.prisma.address.update({
      where: { id },
      data: {
        fullName: data.fullName !== undefined ? data.fullName.trim() || null : undefined,
        phone: data.phone !== undefined ? data.phone.trim() || null : undefined,
        address: data.address !== undefined ? data.address.trim() || '' : undefined,
        city: data.city !== undefined ? data.city.trim() || null : undefined,
        state: data.state !== undefined ? data.state.trim() || null : undefined,
        pincode: data.pincode !== undefined ? data.pincode.trim() || null : undefined,
        landmark: data.landmark !== undefined ? data.landmark.trim() || null : undefined,
        isDefault: data.isDefault !== undefined ? !!data.isDefault : undefined,
      },
    });

    if (updated.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({ where: { id } });

    return { message: 'Address deleted successfully' };
  }

  private validateAddressPayload(data: AddressDto, options: { allowEmpty?: boolean } = {}) {
    const requireAddress = !options.allowEmpty;

    if (requireAddress && !data.address?.trim()) {
      throw new BadRequestException('Address is required');
    }

    if (data.fullName !== undefined && data.fullName !== null && !data.fullName.trim()) {
      throw new BadRequestException('Full name cannot be empty');
    }

    if (data.phone !== undefined && data.phone !== null && !data.phone.trim()) {
      throw new BadRequestException('Phone cannot be empty');
    }

    if (data.address !== undefined && data.address !== null && !data.address.trim()) {
      throw new BadRequestException('Address cannot be empty');
    }
  }
}
