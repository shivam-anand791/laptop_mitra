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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const discount_service_1 = require("./discount.service");
const public_decorator_1 = require("../../decorators/public.decorator");
const get_user_decorator_1 = require("../../decorators/get-user.decorator");
const roles_guard_1 = require("../../guards/roles.guard");
const roles_decorator_1 = require("../../decorators/roles.decorator");
let DiscountController = class DiscountController {
    discountService;
    constructor(discountService) {
        this.discountService = discountService;
    }
    async validateDiscount(body) {
        return this.discountService.validateDiscount(body.code, body.cartTotal);
    }
    async getReferralStats(user) {
        return this.discountService.getReferralStats(user.id);
    }
};
exports.DiscountController = DiscountController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('validate'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate a discount code for a cart total' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Discount validation result' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DiscountController.prototype, "validateDiscount", null);
__decorate([
    (0, common_1.Get)('referral/stats'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CUSTOMER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Get referral statistics and earnings' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Referral stats' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DiscountController.prototype, "getReferralStats", null);
exports.DiscountController = DiscountController = __decorate([
    (0, swagger_1.ApiTags)('discount'),
    (0, common_1.Controller)('discount'),
    __metadata("design:paramtypes", [discount_service_1.DiscountService])
], DiscountController);
//# sourceMappingURL=discount.controller.js.map