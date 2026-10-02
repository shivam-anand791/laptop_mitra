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
let AddressService = class AddressService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId) {
        return this.prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });
    }
    async create(userId, data) {
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
    async update(userId, id, data) {
        const existing = await this.prisma.address.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Address not found');
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
    async remove(userId, id) {
        const existing = await this.prisma.address.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Address not found');
        }
        await this.prisma.address.delete({ where: { id } });
        return { message: 'Address deleted successfully' };
    }
    validateAddressPayload(data, options = {}) {
        const requireAddress = !options.allowEmpty;
        if (requireAddress && !data.address?.trim()) {
            throw new common_1.BadRequestException('Address is required');
        }
        if (data.fullName !== undefined && data.fullName !== null && !data.fullName.trim()) {
            throw new common_1.BadRequestException('Full name cannot be empty');
        }
        if (data.phone !== undefined && data.phone !== null && !data.phone.trim()) {
            throw new common_1.BadRequestException('Phone cannot be empty');
        }
        if (data.address !== undefined && data.address !== null && !data.address.trim()) {
            throw new common_1.BadRequestException('Address cannot be empty');
        }
    }
};
exports.AddressService = AddressService;
exports.AddressService = AddressService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AddressService);
//# sourceMappingURL=address.service.js.map