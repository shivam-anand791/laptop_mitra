import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Address } from '../../types';
import { allowInMemoryFallback } from '../../common/fallback';

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

// In-memory address fallback for offline DB resilience
const inMemoryAddresses: Map<string, Address[]> = new Map();

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<Address[]> {
    try {
      const addresses = await this.prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      if (addresses) {
        return addresses.map((a) => this.formatAddress(a));
      }
    } catch (error: any) {
      this.logger.error(`Database error while finding addresses: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Address service is temporarily unavailable');
      }
    }

    const userAddrs = inMemoryAddresses.get(userId) || [];
    return userAddrs.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  async create(userId: string, data: AddressDto): Promise<Address> {
    this.validateAddressPayload(data);

    const now = new Date().toISOString();
    const newAddress: Address = {
      id: `addr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      fullName: data.fullName?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || '',
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      pincode: data.pincode?.trim() || null,
      landmark: data.landmark?.trim() || null,
      label: data.label?.trim() || 'Home',
      gstin: data.gstin?.trim() || null,
      isDefault: !!data.isDefault,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const created = await this.prisma.address.create({
        data: {
          userId,
          fullName: newAddress.fullName,
          phone: newAddress.phone,
          address: newAddress.address,
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
          landmark: newAddress.landmark,
          isDefault: newAddress.isDefault,
        },
      });
      if (created.isDefault) {
        await this.prisma.address.updateMany({
          where: { userId, id: { not: created.id } },
          data: { isDefault: false },
        });
      }
      return this.formatAddress({ ...created, label: newAddress.label, gstin: newAddress.gstin });
    } catch (error: any) {
      this.logger.error(`Database error while creating address: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Address service is temporarily unavailable');
      }
    }

    const current = inMemoryAddresses.get(userId) || [];
    if (newAddress.isDefault) {
      current.forEach((a) => (a.isDefault = false));
    }
    current.push(newAddress);
    inMemoryAddresses.set(userId, current);
    return newAddress;
  }

  async update(userId: string, id: string, data: AddressDto): Promise<Address> {
    this.validateAddressPayload(data, { allowEmpty: true });

    try {
      const existing = await this.prisma.address.findFirst({
        where: { id, userId },
      });
      if (existing) {
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
        return this.formatAddress({ ...updated, label: data.label, gstin: data.gstin });
      }
      if (!allowInMemoryFallback()) {
        throw new NotFoundException('Address not found');
      }
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Database error while updating address: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Address service is temporarily unavailable');
      }
    }

    const current = inMemoryAddresses.get(userId) || [];
    const idx = current.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new NotFoundException('Address not found');
    }

    if (data.isDefault) {
      current.forEach((a) => (a.isDefault = false));
    }

    current[idx] = {
      ...current[idx],
      fullName: data.fullName !== undefined ? data.fullName.trim() || null : current[idx].fullName,
      phone: data.phone !== undefined ? data.phone.trim() || null : current[idx].phone,
      address: data.address !== undefined ? data.address.trim() || '' : current[idx].address,
      city: data.city !== undefined ? data.city.trim() || null : current[idx].city,
      state: data.state !== undefined ? data.state.trim() || null : current[idx].state,
      pincode: data.pincode !== undefined ? data.pincode.trim() || null : current[idx].pincode,
      landmark: data.landmark !== undefined ? data.landmark.trim() || null : current[idx].landmark,
      label: data.label !== undefined ? data.label.trim() || null : current[idx].label,
      gstin: data.gstin !== undefined ? data.gstin.trim() || null : current[idx].gstin,
      isDefault: data.isDefault !== undefined ? !!data.isDefault : current[idx].isDefault,
      updatedAt: new Date().toISOString(),
    };

    inMemoryAddresses.set(userId, current);
    return current[idx];
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    try {
      const existing = await this.prisma.address.findFirst({
        where: { id, userId },
      });
      if (existing) {
        await this.prisma.address.delete({ where: { id } });
        return { message: 'Address deleted successfully' };
      }
      if (!allowInMemoryFallback()) {
        throw new NotFoundException('Address not found');
      }
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Database error while deleting address: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Address service is temporarily unavailable');
      }
    }

    const current = inMemoryAddresses.get(userId) || [];
    const filtered = current.filter((a) => a.id !== id);
    if (filtered.length === current.length) {
      throw new NotFoundException('Address not found');
    }
    inMemoryAddresses.set(userId, filtered);
    return { message: 'Address deleted successfully' };
  }

  private formatAddress(addr: any): Address {
    return {
      id: addr.id,
      userId: addr.userId,
      fullName: addr.fullName || null,
      phone: addr.phone || null,
      address: addr.address || '',
      city: addr.city || null,
      state: addr.state || null,
      pincode: addr.pincode || null,
      landmark: addr.landmark || null,
      label: addr.label || 'Home',
      gstin: addr.gstin || null,
      isDefault: !!addr.isDefault,
      createdAt: addr.createdAt ? new Date(addr.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: addr.updatedAt ? new Date(addr.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private validateAddressPayload(data: AddressDto, options: { allowEmpty?: boolean } = {}) {
    const requireAddress = !options.allowEmpty;

    if (requireAddress && !data.address?.trim()) {
      throw new BadRequestException('Address is required');
    }

    if (data.pincode && !/^\d{6}$/.test(data.pincode.trim())) {
      throw new BadRequestException('PIN code must be exactly 6 numeric digits (e.g. 560103)');
    }

    if (data.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(data.gstin.trim())) {
      throw new BadRequestException('Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)');
    }

    if (data.phone && !/^[0-9+ -]{10,15}$/.test(data.phone.trim())) {
      throw new BadRequestException('Please enter a valid phone number');
    }
  }
}
