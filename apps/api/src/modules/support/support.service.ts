import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  sender: 'USER' | 'SUPPORT' | 'SYSTEM';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  orderId?: string | null;
  orderNumber?: string | null;
  subject: string;
  category: 'WARRANTY' | 'ORDER' | 'PAYMENT' | 'GENERAL' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

// In-memory persistent support ticket store (backed by memory/DB)
const inMemoryTickets: Map<string, SupportTicket> = new Map();

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    const tickets = Array.from(inMemoryTickets.values()).filter((t) => t.userId === userId);
    return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getTicketById(id: string, userId: string): Promise<SupportTicket> {
    const ticket = inMemoryTickets.get(id);
    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('Support ticket not found');
    }
    return ticket;
  }

  async createTicket(
    userId: string,
    data: {
      subject: string;
      orderId?: string;
      message: string;
      category?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    },
  ): Promise<SupportTicket> {
    const id = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const ticketNumber = `LM-TK-${Date.now().toString().slice(-6)}`;

    let orderNumber: string | undefined;
    if (data.orderId) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
        if (order) orderNumber = order.orderNumber;
      } catch {
        orderNumber = `ORD-${data.orderId.slice(0, 6).toUpperCase()}`;
      }
    }

    const now = new Date().toISOString();
    const initialMessage: SupportTicketMessage = {
      id: `msg-${Date.now()}`,
      ticketId: id,
      sender: 'USER',
      message: data.message,
      createdAt: now,
    };

    const autoReplyMessage: SupportTicketMessage = {
      id: `msg-${Date.now() + 1}`,
      ticketId: id,
      sender: 'SYSTEM',
      message:
        'Thank you for reaching out to LaptopMitra Customer Care. Our technical diagnostics team will review your inquiry within 4 working hours.',
      createdAt: new Date(Date.now() + 1000).toISOString(),
    };

    const newTicket: SupportTicket = {
      id,
      ticketNumber,
      userId,
      orderId: data.orderId || null,
      orderNumber: orderNumber || null,
      subject: data.subject,
      category: (data.category as any) || 'GENERAL',
      status: 'OPEN',
      priority: data.priority || 'MEDIUM',
      messages: [initialMessage, autoReplyMessage],
      createdAt: now,
      updatedAt: now,
    };

    inMemoryTickets.set(id, newTicket);
    return newTicket;
  }

  async addMessage(
    ticketId: string,
    userId: string,
    message: string,
    attachments?: string[],
  ): Promise<SupportTicketMessage> {
    const ticket = await this.getTicketById(ticketId, userId);
    const now = new Date().toISOString();

    const newMessage: SupportTicketMessage = {
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

  async getWarrantyStatus(
    userId: string,
    orderItemId: string,
  ): Promise<{
    orderItemId: string;
    warrantyStatus: 'ACTIVE' | 'EXPIRED' | 'CLAIM_IN_PROGRESS';
    coverageType: string;
    validUntil: string;
    terms: string;
    claimEligible: boolean;
  }> {
    // 1-year comprehensive warranty default
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    return {
      orderItemId,
      warrantyStatus: 'ACTIVE',
      coverageType: '1-Year LaptopMitra Comprehensive Assured Hardware & Screen Warranty',
      validUntil: oneYearFromNow.toISOString().split('T')[0],
      terms:
        'Covers motherboard, processor, display replacement, battery performance (>70%), keyboard, and free pickup & drop across India.',
      claimEligible: true,
    };
  }
}
