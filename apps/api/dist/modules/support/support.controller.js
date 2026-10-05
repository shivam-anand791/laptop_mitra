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
exports.SupportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const support_service_1 = require("./support.service");
const get_user_decorator_1 = require("../../decorators/get-user.decorator");
const roles_guard_1 = require("../../guards/roles.guard");
const roles_decorator_1 = require("../../decorators/roles.decorator");
let SupportController = class SupportController {
    supportService;
    constructor(supportService) {
        this.supportService = supportService;
    }
    async getTickets(user) {
        return this.supportService.getUserTickets(user.id);
    }
    async getTicket(user, id) {
        return this.supportService.getTicketById(id, user.id);
    }
    async createTicket(user, body) {
        return this.supportService.createTicket(user.id, body);
    }
    async addMessage(user, id, body) {
        return this.supportService.addMessage(id, user.id, body.message, body.attachments);
    }
    async getWarrantyStatus(user, orderItemId) {
        return this.supportService.getWarrantyStatus(user.id, orderItemId);
    }
};
exports.SupportController = SupportController;
__decorate([
    (0, common_1.Get)('tickets'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all support tickets for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tickets list' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SupportController.prototype, "getTickets", null);
__decorate([
    (0, common_1.Get)('tickets/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get support ticket details and thread' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ticket details' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SupportController.prototype, "getTicket", null);
__decorate([
    (0, common_1.Post)('tickets'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new support ticket' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Support ticket created' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SupportController.prototype, "createTicket", null);
__decorate([
    (0, common_1.Post)('tickets/:id/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a message / reply to ticket thread' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Message sent' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SupportController.prototype, "addMessage", null);
__decorate([
    (0, common_1.Get)('warranty/:orderItemId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get warranty status for an order item' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Warranty details' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Param)('orderItemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SupportController.prototype, "getWarrantyStatus", null);
exports.SupportController = SupportController = __decorate([
    (0, swagger_1.ApiTags)('support'),
    (0, common_1.Controller)('support'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CUSTOMER', 'ADMIN'),
    __metadata("design:paramtypes", [support_service_1.SupportService])
], SupportController);
//# sourceMappingURL=support.controller.js.map