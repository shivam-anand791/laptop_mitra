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
exports.SupportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const inMemoryTickets = new Map();
let SupportService = class SupportService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserTickets(userId) {
        const tickets = Array.from(inMemoryTickets.values()).filter((t) => t.userId === userId);
        return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async getTicketById(id, userId) {
        const ticket = inMemoryTickets.get(id);
        if (!ticket || ticket.userId !== userId) {
            throw new common_1.NotFoundException('Support ticket not found');
        }
        return ticket;
    }
    async createTicket(userId, data) {
        const id = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const ticketNumber = `LM-TK-${Date.now().toString().slice(-6)}`;
        let orderNumber;
        if (data.orderId) {
            try {
                const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
                if (order)
                    orderNumber = order.orderNumber;
            }
            catch {
                orderNumber = `ORD-${data.orderId.slice(0, 6).toUpperCase()}`;
            }
        }
        const now = new Date().toISOString();
        const initialMessage = {
            id: `msg-${Date.now()}`,
            ticketId: id,
            sender: 'USER',
            message: data.message,
            createdAt: now,
        };
        const autoReplyMessage = {
            id: `msg-${Date.now() + 1}`,
            ticketId: id,
            sender: 'SYSTEM',
            message: 'Thank you for reaching out to LaptopMitra Customer Care. Our technical diagnostics team will review your inquiry within 4 working hours.',
            createdAt: new Date(Date.now() + 1000).toISOString(),
        };
        const newTicket = {
            id,
            ticketNumber,
            userId,
            orderId: data.orderId || null,
            orderNumber: orderNumber || null,
            subject: data.subject,
            category: data.category || 'GENERAL',
            status: 'OPEN',
            priority: data.priority || 'MEDIUM',
            messages: [initialMessage, autoReplyMessage],
            createdAt: now,
            updatedAt: now,
        };
        inMemoryTickets.set(id, newTicket);
        return newTicket;
    }
    async addMessage(ticketId, userId, message, attachments) {
        const ticket = await this.getTicketById(ticketId, userId);
        const now = new Date().toISOString();
        const newMessage = {
            id: `msg-${Date.now()}`,
            ticketId,
            sender: 'USER',
            message,
            attachments,
            createdAt: now,
        };
        ticket.messages.push(newMessage);
        ticket.updatedAt = now;
        if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
            ticket.status = 'IN_PROGRESS';
        }
        inMemoryTickets.set(ticketId, ticket);
        return newMessage;
    }
    async getWarrantyStatus(userId, orderItemId) {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        return {
            orderItemId,
            warrantyStatus: 'ACTIVE',
            coverageType: '1-Year LaptopMitra Comprehensive Assured Hardware & Screen Warranty',
            validUntil: oneYearFromNow.toISOString().split('T')[0],
            terms: 'Covers motherboard, processor, display replacement, battery performance (>70%), keyboard, and free pickup & drop across India.',
            claimEligible: true,
        };
    }
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupportService);
//# sourceMappingURL=support.service.js.map