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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const payment_service_1 = require("./payment.service");
const swagger_1 = require("@nestjs/swagger");
const get_user_decorator_1 = require("../../decorators/get-user.decorator");
const public_decorator_1 = require("../../decorators/public.decorator");
const roles_guard_1 = require("../../guards/roles.guard");
const roles_decorator_1 = require("../../decorators/roles.decorator");
let PaymentController = class PaymentController {
    paymentService;
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async createRazorpayOrder(user, orderId, _clientAmount) {
        if (!orderId) {
            throw new common_1.BadRequestException('orderId is required');
        }
        return this.paymentService.createOrderForUser(orderId, user.id, user.role);
    }
    async verifyPayment(user, body) {
        if (!body?.orderId || !body?.razorpayOrderId || !body?.razorpayPaymentId || !body?.razorpaySignature) {
            throw new common_1.BadRequestException('Missing payment verification fields');
        }
        return this.paymentService.verifyPayment(body.orderId, body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature, user.id, user.role);
    }
    async getPaymentHistory(user) {
        return this.paymentService.getPaymentHistory(user.id);
    }
    async handleRazorpayWebhook(payload, signature) {
        if (!signature) {
            return { valid: false, event: 'missing_signature' };
        }
        const result = await this.paymentService.handlePaymentWebhook(payload, signature);
        return result;
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('razorpay/order'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CUSTOMER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Create Razorpay order for checkout (server-validated amount and ownership)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Razorpay order created' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)('orderId')),
    __param(2, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "createRazorpayOrder", null);
__decorate([
    (0, common_1.Post)('razorpay/verify'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CUSTOMER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify Razorpay payment signature server-side' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment verified' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CUSTOMER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get payment transaction history for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment records' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPaymentHistory", null);
__decorate([
    (0, common_1.Post)('razorpay/webhook'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Razorpay webhook handler' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-razorpay-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleRazorpayWebhook", null);
exports.PaymentController = PaymentController = __decorate([
    (0, swagger_1.ApiTags)('payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map