"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const inMemoryAddresses = new Map();
let AddressService = class AddressService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId) {
        try {
            const addresses = await this.prisma.address.findMany({
                where: { userId },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
            });
            if (addresses) {
                return addresses.map((a) => this.formatAddress(a));
            }
        }
        catch {
        }
        const userAddrs = inMemoryAddresses.get(userId) || [
            {
                id: `addr-default-${userId.slice(0, 5)}`,
                userId,
                fullName: 'Demo Customer',
                phone: '+91 9876543210',
                address: 'B-402, Prestige Tech Park, Outer Ring Road',
                city: 'Bengaluru',
                state: 'Karnataka',
                pincode: '560103',
                landmark: 'Near Marathahalli Bridge',
                label: 'Work',
                gstin: '29ABCDE1234F1Z5',
                isDefault: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ];
        return userAddrs.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    }
    async create(userId, data) {
        this.validateAddressPayload(data);
        const now = new Date().toISOString();
        const newAddress = {
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
        }
        catch {
        }
        const current = inMemoryAddresses.get(userId) || [];
        if (newAddress.isDefault) {
            current.forEach((a) => (a.isDefault = false));
        }
        current.push(newAddress);
        inMemoryAddresses.set(userId, current);
        return newAddress;
    }
    async update(userId, id, data) {
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
        }
        catch {
        }
        const current = inMemoryAddresses.get(userId) || [];
        const idx = current.findIndex((a) => a.id === id);
        if (idx === -1) {
            throw new common_1.NotFoundException('Address not found');
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
    async remove(userId, id) {
        try {
            const existing = await this.prisma.address.findFirst({
                where: { id, userId },
            });
            if (existing) {
                await this.prisma.address.delete({ where: { id } });
                return { message: 'Address deleted successfully' };
            }
        }
        catch {
        }
        const current = inMemoryAddresses.get(userId) || [];
        const filtered = current.filter((a) => a.id !== id);
        if (filtered.length === current.length) {
            throw new common_1.NotFoundException('Address not found');
        }
        inMemoryAddresses.set(userId, filtered);
        return { message: 'Address deleted successfully' };
    }
    formatAddress(addr) {
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
    validateAddressPayload(data, options = {}) {
        const requireAddress = !options.allowEmpty;
        if (requireAddress && !data.address?.trim()) {
            throw new common_1.BadRequestException('Address is required');
        }
        if (data.pincode && !/^\d{6}$/.test(data.pincode.trim())) {
            throw new common_1.BadRequestException('PIN code must be exactly 6 numeric digits (e.g. 560103)');
        }
        if (data.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(data.gstin.trim())) {
            throw new common_1.BadRequestException('Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)');
        }
        if (data.phone && !/^[0-9+ -]{10,15}$/.test(data.phone.trim())) {
            throw new common_1.BadRequestException('Please enter a valid phone number');
        }
    }
};
exports.AddressService = AddressService;
exports.AddressService = AddressService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AddressService);
//# sourceMappingURL=address.service.js.map