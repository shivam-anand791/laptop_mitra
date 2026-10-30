import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { PaymentEncryptionService } from '../../common/encryption/payment-encryption.service';
import { PaymentService } from '../payments/payment.service';
import { CreateCorporateInquiryDto } from './dto/create-corporate-inquiry.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { UpdateRefundDetailsDto } from './dto/update-refund-details.dto';
import {
  AdminTicketQueryDto,
  UpdateAdminTicketDto,
  AdminReturnQueryDto,
  ProcessAdminReturnDto,
  ProcessAdminRefundDto,
  SavedReplyDto,
  CreateHelpCategoryDto,
  UpdateHelpCategoryDto,
  CreateHelpArticleDto,
  UpdateHelpArticleDto,
  UpdateSupportSettingsDto,
} from './dto/admin-support.dto';

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export const SUPPORT_CATEGORIES = [
  {
    id: 'ORDER_DELIVERY',
    label: 'Order & Delivery',
    issues: [
      { id: 'TRACKING', label: 'Where is my order / Live tracking' },
      { id: 'DELAYED_DELIVERY', label: 'Delivery delayed beyond estimated date' },
      { id: 'WRONG_ADDRESS', label: 'Change delivery address / contact number' },
      { id: 'DELIVERY_RESCHEDULE', label: 'Reschedule delivery date / slot' },
      { id: 'CANCEL_ORDER', label: 'Cancel order before dispatch' },
    ],
  },
  {
    id: 'RETURN_REFUND',
    label: 'Return, Replacement & Refund',
    issues: [
      { id: 'DAMAGED_ON_ARRIVAL', label: 'Damaged or broken laptop received' },
      { id: 'WRONG_ITEM_DELIVERED', label: 'Different laptop model received' },
      { id: 'MISSING_ACCESSORIES', label: 'Missing charger, power cable, or accessories' },
      { id: 'HARDWARE_DEFECT', label: 'Hardware defect (screen, keyboard, battery)' },
      { id: 'ITEM_NOT_AS_DESCRIBED', label: 'Cosmetic condition lower than specified grade' },
      { id: 'REFUND_STATUS', label: 'Check status of approved refund / UTR' },
    ],
  },
  {
    id: 'WARRANTY_REPAIR',
    label: 'Warranty & Repair Claims',
    issues: [
      { id: 'HARDWARE_FAILURE', label: 'Motherboard / processor / power failure' },
      { id: 'BATTERY_ISSUE', label: 'Battery not charging or draining quickly' },
      { id: 'DISPLAY_DEFECT', label: 'Screen flickering, lines, or dead pixels' },
      { id: 'EXTENDED_WARRANTY_CLAIM', label: 'Claim under Extended Warranty pack' },
    ],
  },
  {
    id: 'PAYMENT',
    label: 'Payment & Billing',
    issues: [
      { id: 'PAYMENT_DEDUCTED_NO_ORDER', label: 'Money deducted from bank but order not placed' },
      { id: 'INVOICE_REQUEST', label: 'Download GST tax invoice with company details' },
      { id: 'PAYMENT_FAILED', label: 'Payment failed at gateway' },
    ],
  },
  {
    id: 'RENT_LEASE',
    label: 'Rent / Fleet Lease',
    issues: [
      { id: 'LEASE_EXTENSION', label: 'Extend current leasing tenure' },
      { id: 'EARLY_TERMINATION', label: 'Early lease termination / device return' },
      { id: 'UPGRADE_DEVICE', label: 'Upgrade rented laptop to higher configuration' },
      { id: 'MAINTENANCE_VISIT', label: 'Schedule on-site maintenance engineer' },
    ],
  },
  {
    id: 'BUYBACK',
    label: 'Lifetime Buyback Guarantee',
    issues: [
      { id: 'QUOTE_EVALUATION', label: 'Request buyback valuation quote' },
      { id: 'DEVICE_PICKUP', label: 'Schedule inspection & doorstep pickup' },
      { id: 'BUYBACK_PAYOUT', label: 'Payment inquiry for completed buyback' },
    ],
  },
  {
    id: 'AFFILIATE_PAYOUT',
    label: 'Referrals & Earnings',
    issues: [
      { id: 'COMMISSION_MISSING', label: 'Referral commission not credited for friend purchase' },
      { id: 'WITHDRAWAL_DELAY', label: 'Withdrawal payout delayed' },
      { id: 'PAYOUT_BANK_UPDATE', label: 'Update payout bank account / UPI QR' },
    ],
  },
  {
    id: 'ACCOUNT',
    label: 'Account & Security',
    issues: [
      { id: 'LOGIN_ISSUE', label: 'Cannot login with mobile / OTP' },
      { id: 'PHONE_UPDATE', label: 'Update registered phone number' },
      { id: 'DELETE_ACCOUNT', label: 'Account deletion request' },
    ],
  },
  {
    id: 'CORPORATE_BULK',
    label: 'Corporate & Bulk Procurement',
    issues: [
      { id: 'GST_INVOICE_CORRECTION', label: 'B2B GSTIN addition / invoice amendment' },
      { id: 'BULK_QUOTE', label: 'Procurement quote for 10+ laptops' },
      { id: 'FLEET_SUPPORT', label: 'Dedicated corporate account manager support' },
    ],
  },
  {
    id: 'OTHER',
    label: 'Other Assistance',
    issues: [
      { id: 'GENERAL_FEEDBACK', label: 'Feedback & suggestions' },
      { id: 'OTHER_QUERY', label: 'Other inquiry' },
    ],
  },
];

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notificationService?: NotificationService,
    @Optional() private encryptionService?: PaymentEncryptionService,
    @Optional() private paymentService?: PaymentService,
  ) {}


  // ---------------------------------------------------------------------------
  // 1. Corporate Inquiry
  // ---------------------------------------------------------------------------
  async createCorporateInquiry(dto: CreateCorporateInquiryDto) {
    if (dto.website && dto.website.trim().length > 0) {
      throw new BadRequestException('Invalid submission');
    }

    if (!dto.companyName?.trim()) throw new BadRequestException('Company name is required');
    if (dto.companyName.trim().length > 150) throw new BadRequestException('Company name cannot exceed 150 characters');
    if (!dto.contactPerson?.trim()) throw new BadRequestException('Contact person name is required');
    if (dto.contactPerson.trim().length > 100) throw new BadRequestException('Contact person name cannot exceed 100 characters');
    if (!dto.email?.trim() || !dto.email.includes('@')) throw new BadRequestException('A valid business email is required');
    if (dto.email.trim().length > 255) throw new BadRequestException('Email cannot exceed 255 characters');
    if (!dto.phone?.trim() || dto.phone.trim().length < 8) throw new BadRequestException('A valid phone number is required');
    if (dto.phone.trim().length > 30) throw new BadRequestException('Phone number cannot exceed 30 characters');
    if (!dto.city?.trim()) throw new BadRequestException('City is required');
    if (dto.city.trim().length > 100) throw new BadRequestException('City cannot exceed 100 characters');
    if (dto.laptopModel && dto.laptopModel.length > 150) throw new BadRequestException('Laptop model cannot exceed 150 characters');
    if (dto.expectedTenure && dto.expectedTenure.length > 100) throw new BadRequestException('Expected tenure cannot exceed 100 characters');
    if (dto.notes && dto.notes.length > 2000) throw new BadRequestException('Notes cannot exceed 2000 characters');

    let mode: 'sell' | 'lease' = 'sell';
    if (dto.mode !== undefined && dto.mode !== null) {
      if (dto.mode !== 'sell' && dto.mode !== 'lease') {
        throw new BadRequestException("Mode must be either 'sell' or 'lease'");
      }
      mode = dto.mode;
    }

    let quantity = 5;
    if (dto.quantity !== undefined && dto.quantity !== null) {
      if (typeof dto.quantity !== 'number' || !Number.isInteger(dto.quantity) || dto.quantity < 1) {
        throw new BadRequestException('Quantity must be an integer greater than or equal to 1');
      }
      quantity = dto.quantity;
    }

    const inquiry = await this.prisma.corporateInquiry.create({
      data: {
        companyName: dto.companyName.trim(),
        contactPerson: dto.contactPerson.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone.trim(),
        city: dto.city.trim(),
        mode,
        quantity,
        laptopModel: dto.laptopModel?.trim() || null,
        productId: dto.productId || null,
        expectedTenure: dto.expectedTenure?.trim() || null,
        notes: dto.notes?.trim() || null,
        source: dto.source || 'web',
        status: 'PENDING',
      },
    });

    try {
      if (this.notificationService) {
        await this.notificationService.dispatchCorporateInquiryAlert(inquiry);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch corporate inquiry alert: ${err?.message || err}`);
    }

    return inquiry;
  }

  // ---------------------------------------------------------------------------
  // 2. Guided Flow Configuration
  // ---------------------------------------------------------------------------
  async getSupportConfig() {
    return {
      categories: SUPPORT_CATEGORIES,
      supportHoursText: 'Monday to Saturday, 9:30 AM to 6:30 PM IST',
      firstResponseSlaHours: 24,
      autoCloseDays: 7,
      reopenWindowDays: 7,
      returnWindowDays: 7,
      standardWarrantyDays: 180,
      contact: {
        phone: '+91 98765 43210',
        whatsapp: '+91 98765 43210',
        email: 'support@laptopmitra.com',
      },
      securityNotice:
        'LaptopMitra staff will NEVER ask for your password, OTP, ATM PIN, UPI PIN, or CVV. Never share sensitive credentials with anyone.',
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Help Center Knowledge Base
  // ---------------------------------------------------------------------------
  async getHelpCategories() {
    const categories = await this.prisma.helpCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            articles: {
              where: { isPublished: true },
            },
          },
        },
      },
    });

    if (categories.length === 0 && await this.prisma.helpCategory.count() === 0) {
      return this.getFallbackHelpCategories();
    }

    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      icon: c.icon,
      order: c.order,
      articleCount: c._count?.articles ?? 0,
    }));
  }

  async getHelpArticles(query?: string, categorySlug?: string) {
    const where: any = {
      isPublished: true,
      category: { isActive: true },
    };

    if (categorySlug) {
      where.category.slug = categorySlug;
    }

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
      ];
    }

    const articles = await this.prisma.helpArticle.findMany({
      where,
      orderBy: [{ order: 'asc' }, { helpfulCount: 'desc' }],
      include: {
        category: {
          select: { id: true, slug: true, title: true, icon: true },
        },
      },
      take: 50,
    });

    if (
      articles.length === 0 &&
      !query &&
      !categorySlug &&
      await this.prisma.helpCategory.count() === 0
    ) {
      return this.getFallbackHelpArticles();
    }

    return articles;
  }

  async getHelpArticleBySlug(slug: string) {
    const article = await this.prisma.helpArticle.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });

    if (!article || !article.isPublished || !article.category.isActive) {
      // Check fallback
      const fallback = this.getFallbackHelpArticles().find((a) => a.slug === slug);
      if (fallback) return fallback;
      throw new NotFoundException(`Help article with slug '${slug}' not found`);
    }

    // Fire and forget viewCount increment
    this.prisma.helpArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => null);

    return article;
  }

  async voteHelpArticle(id: string, helpful: boolean) {
    try {
      const article = await this.prisma.helpArticle.update({
        where: { id },
        data: helpful
          ? { helpfulCount: { increment: 1 } }
          : { notHelpfulCount: { increment: 1 } },
      });
      return { success: true, helpfulCount: article.helpfulCount, notHelpfulCount: article.notHelpfulCount };
    } catch {
      // Fallback for mocked/unseeded
      return { success: true, helpfulCount: helpful ? 1 : 0, notHelpfulCount: helpful ? 0 : 1 };
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Ticket Management (Customer & Support)
  // ---------------------------------------------------------------------------
  async getUserTickets(userId: string) {
    let tickets;
    try {
      tickets = await this.prisma.supportTicket.findMany({
        where: {
          userId,
          isArchived: false,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            where: { isInternal: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: { where: { isInternal: false } },
              attachments: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to fetch customer support tickets', error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Support service is temporarily unavailable');
    }

    return tickets.map((t) => {
      const hasUnread = t.staffLastReadAt && (!t.customerLastReadAt || t.staffLastReadAt > t.customerLastReadAt);
      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        issueType: t.issueType,
        type: t.type,
        status: t.status,
        priority: t.priority,
        orderId: t.orderId,
        orderItemId: t.orderItemId,
        reopenCount: t.reopenCount,
        hasUnread: !!hasUnread,
        messageCount: t._count.messages,
        attachmentCount: t._count.attachments,
        lastMessage: t.messages[0]?.body || null,
        csatScore: t.csatScore,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        resolvedAt: t.resolvedAt,
      };
    });
  }

  async getTicketById(id: string, userId: string, isStaff: boolean = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        orderItem: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        messages: {
          where: isStaff ? {} : { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: {
            authorUser: {
              select: { id: true, name: true, role: true, imageUrl: true },
            },
            attachments: true,
          },
        },
        attachments: true,
        events: isStaff
          ? { orderBy: { createdAt: 'asc' } }
          : {
              where: {
                eventType: { in: ['CREATED', 'MESSAGE', 'STATUS_CHANGE', 'REOPEN', 'CSAT_RATING', 'RESOLVED', 'CLOSED'] },
              },
              orderBy: { createdAt: 'asc' },
            },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Strict IDOR ownership check
    if (!isStaff && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this support ticket');
    }

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: isStaff ? { staffLastReadAt: new Date() } : { customerLastReadAt: new Date() },
    });

    return ticket;
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    if (!dto.subject?.trim()) throw new BadRequestException('Subject is required');
    if (!dto.message?.trim()) throw new BadRequestException('Message is required');
    if (!dto.category?.trim()) throw new BadRequestException('Category is required');

    // Generate sequence ticket number
    let ticketNumber: string;
    try {
      const result = await this.prisma.$queryRaw<{ nextval: any }[]>`SELECT nextval('ticket_number_seq')`;
      if (!result[0]?.nextval) throw new Error('Ticket number sequence returned no value');
      ticketNumber = `LM-T-${result[0].nextval}`;
    } catch (error) {
      this.logger.error('Failed to allocate a ticket number', error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Unable to allocate a ticket number');
    }

    const firstResponseDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          ticketNumber,
          userId,
          orderId: dto.orderId || null,
          orderItemId: dto.orderItemId || null,
          subject: dto.subject.trim(),
          category: dto.category.trim(),
          issueType: dto.issueType?.trim() || null,
          type: dto.type || 'QUERY',
          priority: dto.priority || 'MEDIUM',
          source: dto.source || 'web',
          status: 'NEW',
          callbackPhone: dto.callbackPhone?.trim() || null,
          callbackSlot: dto.callbackSlot?.trim() || null,
          firstResponseDueAt,
          customerLastReadAt: new Date(),
        },
      });

      // Initial customer message
      const initialMessage = await tx.ticketMessage.create({
        data: {
          ticketId: created.id,
          authorUserId: userId,
          authorRole: 'CUSTOMER',
          isInternal: false,
          body: dto.message.trim(),
        },
      });

      // TicketEvent: CREATED
      await tx.ticketEvent.create({
        data: {
          ticketId: created.id,
          actorUserId: userId,
          actorRole: 'CUSTOMER',
          eventType: 'CREATED',
          newValue: 'NEW',
          metadata: {
            subject: dto.subject,
            category: dto.category,
            orderId: dto.orderId,
          },
        },
      });

      // Link any pre-uploaded attachments
      if (dto.attachments && dto.attachments.length > 0) {
        for (const storageKey of dto.attachments) {
          await tx.ticketAttachment.create({
            data: {
              ticketId: created.id,
              messageId: initialMessage.id,
              uploadedBy: userId,
              storageKey,
              fileName: storageKey.split('/').pop() || 'attachment',
              fileType: storageKey.endsWith('.mp4') || storageKey.endsWith('.mov') ? 'VIDEO' : 'IMAGE',
              mimeType: storageKey.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
              fileSize: 1024,
              confirmed: true,
            },
          });
        }
      }

      return created;
    });

    this.logger.log(`Ticket #${ticket.ticketNumber} created successfully for user ${userId}`);
    await this.notificationService?.dispatchSupportNotification(userId, {
      type: 'ticket-created',
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
    });
    return ticket;
  }

  async addMessage(
    ticketId: string,
    userId: string,
    message: string,
    attachments?: string[],
    role: 'CUSTOMER' | 'SUPPORT' | 'ADMIN' = 'CUSTOMER',
    isInternal: boolean = false,
  ) {
    if (!message?.trim()) throw new BadRequestException('Message cannot be empty');

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // Strict IDOR ownership check
    if (role === 'CUSTOMER' && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    const createdMessage = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.ticketMessage.create({
        data: {
          ticketId,
          authorUserId: userId,
          authorRole: role,
          isInternal,
          body: message.trim(),
        },
      });

      // Status transitions
      const updates: any = { updatedAt: new Date() };

      if (role === 'CUSTOMER') {
        updates.customerLastReadAt = new Date();
        if (ticket.status === 'WAITING_ON_CUSTOMER' || ticket.status === 'RESOLVED') {
          updates.status = 'OPEN';
        }
      } else {
        updates.staffLastReadAt = new Date();
        if (ticket.status === 'NEW') {
          updates.status = 'OPEN';
        }
        if (!ticket.firstResponseAt) {
          updates.firstResponseAt = new Date();
        }
      }

      await tx.supportTicket.update({
        where: { id: ticketId },
        data: updates,
      });

      // TicketEvent: MESSAGE
      await tx.ticketEvent.create({
        data: {
          ticketId,
          actorUserId: userId,
          actorRole: role,
          eventType: 'MESSAGE',
          metadata: {
            messageId: msg.id,
            isInternal,
          },
        },
      });

      // Link attachments
      if (attachments && attachments.length > 0) {
        for (const storageKey of attachments) {
          await tx.ticketAttachment.create({
            data: {
              ticketId,
              messageId: msg.id,
              uploadedBy: userId,
              storageKey,
              fileName: storageKey.split('/').pop() || 'attachment',
              fileType: storageKey.endsWith('.mp4') ? 'VIDEO' : 'IMAGE',
              mimeType: storageKey.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
              fileSize: 1024,
              confirmed: true,
            },
          });
        }
      }

      return msg;
    });

    if (role !== 'CUSTOMER' && !isInternal) {
      await this.notificationService?.dispatchSupportNotification(ticket.userId, {
        type: 'ticket-reply',
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
      });
    }

    return createdMessage;
  }

  async reopenTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) throw new ForbiddenException('You do not have permission to reopen this ticket');

    if (ticket.status !== 'RESOLVED') {
      throw new BadRequestException(`Only tickets with status 'RESOLVED' can be reopened. Current status: ${ticket.status}`);
    }

    // Check 7-day reopen window
    if (ticket.resolvedAt) {
      const diffMs = Date.now() - ticket.resolvedAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        throw new BadRequestException('The 7-day reopen window for this ticket has expired. Please raise a new ticket.');
      }
    }

    const reopened = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'REOPENED',
          reopenCount: { increment: 1 },
          closedAt: null,
          customerLastReadAt: new Date(),
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          actorUserId: userId,
          actorRole: 'CUSTOMER',
          eventType: 'REOPEN',
          oldValue: 'RESOLVED',
          newValue: 'REOPENED',
        },
      });

      return updated;
    });

    await this.notificationService?.dispatchSupportNotification(userId, {
      type: 'ticket-reopened',
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
    });
    return reopened;
  }

  async rateTicket(ticketId: string, userId: string, score: number, comment?: string) {
    if (score < 1 || score > 5) {
      throw new BadRequestException('CSAT score must be an integer between 1 and 5');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) throw new ForbiddenException('You do not have permission to rate this ticket');

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          csatScore: score,
          csatComment: comment?.trim() || null,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          actorUserId: userId,
          actorRole: 'CUSTOMER',
          eventType: 'CSAT_RATING',
          newValue: String(score),
          metadata: { comment: comment?.trim() || null },
        },
      });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Returns & Refunds Workflow
  // ---------------------------------------------------------------------------
  async createReturnRequest(userId: string, dto: CreateReturnRequestDto) {
    if (!dto.orderId) throw new BadRequestException('Order ID is required');
    if (!dto.reason?.trim()) throw new BadRequestException('Return reason is required');
    if (!dto.items || dto.items.length === 0) throw new BadRequestException('At least one item must be selected for return');

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('You do not have permission to initiate return for this order');

    // 7-day return window rule
    const deliveryDate = order.status === 'DELIVERED' ? (order.updatedAt || order.createdAt) : order.createdAt;
    const diffDays = (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
      throw new BadRequestException('The 7-day return policy window has expired for this order');
    }

    // Sequence return number
    let returnNumber: string;
    try {
      const result = await this.prisma.$queryRaw<{ nextval: any }[]>`SELECT nextval('return_number_seq')`;
      if (!result[0]?.nextval) throw new Error('Return number sequence returned no value');
      returnNumber = `LM-R-${result[0].nextval}`;
    } catch (error) {
      this.logger.error('Failed to allocate a return number', error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Unable to allocate a return number');
    }

    // Handle refund details for COD / Bank transfer
    let refundAccountMasked: string | null = null;
    let refundIfscMasked: string | null = null;
    let refundUpiMasked: string | null = null;
    let encryptedRefundDetails: string | null = null;

    if (dto.refundDetails) {
      const rd = dto.refundDetails;
      if (rd.accountNumber) {
        if (rd.confirmAccountNumber && rd.accountNumber !== rd.confirmAccountNumber) {
          throw new BadRequestException('Bank account numbers do not match');
        }
        if (!rd.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(rd.ifscCode.trim().toUpperCase())) {
          throw new BadRequestException('Invalid Indian Bank IFSC Code format (e.g. HDFC0001234)');
        }
        if (!rd.accountHolderName?.trim()) {
          throw new BadRequestException('Account holder name is required');
        }
        const acc = rd.accountNumber.trim();
        refundAccountMasked = `••••••••${acc.slice(-4)}`;
        const ifsc = rd.ifscCode.trim().toUpperCase();
        refundIfscMasked = `${ifsc.slice(0, 4)}••••${ifsc.slice(-3)}`;

        const payload = JSON.stringify({
          accountNumber: acc,
          ifscCode: ifsc,
          accountHolderName: rd.accountHolderName.trim(),
        });
        encryptedRefundDetails = this.encryptionService ? this.encryptionService.encrypt(payload) : payload;
      } else if (rd.upiId) {
        const upi = rd.upiId.trim();
        if (!upi.includes('@')) throw new BadRequestException('Invalid UPI address format (e.g. name@bank)');
        refundUpiMasked = `${upi.slice(0, 2)}••••@${upi.split('@')[1]}`;
        encryptedRefundDetails = this.encryptionService ? this.encryptionService.encrypt(JSON.stringify({ upiId: upi })) : JSON.stringify({ upiId: upi });
      }
    }

    const returnRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.returnRequest.create({
        data: {
          returnNumber,
          orderId: dto.orderId,
          userId,
          ticketId: dto.ticketId || null,
          type: dto.type || 'REFUND',
          reason: dto.reason.trim(),
          status: 'REQUESTED',
          refundMethod: dto.refundMethod || 'SOURCE',
          refundAccountMasked,
          refundIfscMasked,
          refundUpiMasked,
          encryptedRefundDetails,
          refundDetailsUpdatedAt: encryptedRefundDetails ? new Date() : null,
          pickupAddress: (order.shippingAddress as any) || null,
        },
      });

      for (const item of dto.items) {
        const orderItem = order.items.find((oi) => oi.id === item.orderItemId);
        if (!orderItem) continue;

        await tx.returnItem.create({
          data: {
            returnRequestId: created.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity || 1,
            unitPrice: orderItem.price,
            reason: item.reason?.trim() || dto.reason.trim(),
          },
        });
      }

      // Link evidence attachments
      if (dto.attachments && dto.attachments.length > 0) {
        for (const storageKey of dto.attachments) {
          await tx.ticketAttachment.create({
            data: {
              returnRequestId: created.id,
              uploadedBy: userId,
              purpose: 'CUSTOMER_EVIDENCE',
              storageKey,
              fileName: storageKey.split('/').pop() || 'evidence',
              fileType: storageKey.endsWith('.mp4') ? 'VIDEO' : 'IMAGE',
              mimeType: storageKey.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
              fileSize: 1024,
              confirmed: true,
            },
          });
        }
      }

      return created;
    });

    return returnRequest;
  }

  async getReturnRequestById(id: string, userId: string, isStaff: boolean = false) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        items: {
          include: {
            orderItem: {
              include: {
                product: {
                  include: {
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        attachments: true,
      },
    });

    if (!returnRequest) throw new NotFoundException('Return request not found');
    if (!isStaff && returnRequest.userId !== userId) {
      throw new ForbiddenException('You do not have access to this return request');
    }

    // Never return encrypted raw payout details in client response
    const { encryptedRefundDetails, ...safeResponse } = returnRequest as any;
    return safeResponse;
  }

  async updateRefundDetails(id: string, userId: string, dto: UpdateRefundDetailsDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
    });

    if (!returnRequest) throw new NotFoundException('Return request not found');
    if (returnRequest.userId !== userId) throw new ForbiddenException('You do not have permission to update this return request');

    if (returnRequest.status === 'REFUNDED' || returnRequest.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot update refund details for a return in status '${returnRequest.status}'`);
    }

    let refundAccountMasked: string | null = null;
    let refundIfscMasked: string | null = null;
    let refundUpiMasked: string | null = null;
    let encryptedRefundDetails: string | null = null;

    if (dto.accountNumber) {
      if (dto.confirmAccountNumber && dto.accountNumber !== dto.confirmAccountNumber) {
        throw new BadRequestException('Bank account numbers do not match');
      }
      if (!dto.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(dto.ifscCode.trim().toUpperCase())) {
        throw new BadRequestException('Invalid Indian Bank IFSC Code format (e.g. HDFC0001234)');
      }
      if (!dto.accountHolderName?.trim()) {
        throw new BadRequestException('Account holder name is required');
      }

      const acc = dto.accountNumber.trim();
      refundAccountMasked = `••••••••${acc.slice(-4)}`;
      const ifsc = dto.ifscCode.trim().toUpperCase();
      refundIfscMasked = `${ifsc.slice(0, 4)}••••${ifsc.slice(-3)}`;

      const payload = JSON.stringify({
        accountNumber: acc,
        ifscCode: ifsc,
        accountHolderName: dto.accountHolderName.trim(),
      });
      encryptedRefundDetails = this.encryptionService ? this.encryptionService.encrypt(payload) : payload;
    } else if (dto.upiId) {
      const upi = dto.upiId.trim();
      if (!upi.includes('@')) throw new BadRequestException('Invalid UPI ID format (e.g. name@okhdfcbank)');
      refundUpiMasked = `${upi.slice(0, 2)}••••@${upi.split('@')[1]}`;
      encryptedRefundDetails = this.encryptionService ? this.encryptionService.encrypt(JSON.stringify({ upiId: upi })) : JSON.stringify({ upiId: upi });
    } else {
      throw new BadRequestException('Either bank account details or UPI ID must be provided');
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: {
        refundAccountMasked: refundAccountMasked || returnRequest.refundAccountMasked,
        refundIfscMasked: refundIfscMasked || returnRequest.refundIfscMasked,
        refundUpiMasked: refundUpiMasked || returnRequest.refundUpiMasked,
        encryptedRefundDetails,
        refundDetailsUpdatedAt: new Date(),
      },
    });

    const { encryptedRefundDetails: _, ...safeResponse } = updated as any;
    return safeResponse;
  }

  // ---------------------------------------------------------------------------
  // 6. Warranty Status
  // ---------------------------------------------------------------------------
  async getWarrantyStatus(userId: string, orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        product: true,
      },
    });

    if (!orderItem) throw new NotFoundException('Order item not found');
    if (orderItem.order.userId !== userId) throw new ForbiddenException('Unauthorized');

    const startDate = orderItem.order.updatedAt || orderItem.order.createdAt;
    const warrantyDays = 180; // 6 months standard warranty
    const endDate = new Date(startDate.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const isActive = now <= endDate;
    const daysRemaining = isActive ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      orderItemId,
      productName: orderItem.product.name,
      sku: orderItem.product.sku,
      standardWarrantyDays: warrantyDays,
      startDate,
      endDate,
      isActive,
      daysRemaining,
      coverageType: '6-Month Comprehensive Hardware Warranty',
      termsSummary: 'Covers motherboard, display, and internal component hardware failure. Excludes physical and liquid damage.',
    };
  }

  // ---------------------------------------------------------------------------
  // Seed / Fallback Helpers
  // ---------------------------------------------------------------------------
  private getFallbackHelpCategories() {
    return [
      { id: 'cat-returns', slug: 'returns-refunds', title: 'Returns, Replacement & Refunds', icon: 'RotateCcw', order: 1, articleCount: 3 },
      { id: 'cat-warranty', slug: 'warranty-repair', title: '6-Month Warranty & Repair', icon: 'ShieldCheck', order: 2, articleCount: 2 },
      { id: 'cat-buyback', slug: 'buyback-guarantee', title: 'Lifetime Buyback Guarantee', icon: 'Coins', order: 3, articleCount: 2 },
      { id: 'cat-orders', slug: 'orders-delivery', title: 'Orders & Pan-India Delivery', icon: 'Truck', order: 4, articleCount: 2 },
      { id: 'cat-rentals', slug: 'rentals-leasing', title: 'Corporate Rentals & Leasing', icon: 'Briefcase', order: 5, articleCount: 1 },
      { id: 'cat-payments', slug: 'payments-security', title: 'Payments, Invoices & Safety', icon: 'CreditCard', order: 6, articleCount: 2 },
    ];
  }

  private getFallbackHelpArticles() {
    return [
      {
        id: 'art-return-policy',
        slug: '7-day-replacement-return-policy',
        title: 'How does LaptopMitra 7-Day Replacement & Return Policy work?',
        summary: 'Understand eligible defect criteria, doorstep verification, and 7-10 day refund turnaround.',
        content: `### 7-Day Replacement & Return Policy

At LaptopMitra, all certified refurbished laptops are backed by a **7-Day Replacement or Return Policy** starting from the exact date and time of delivery.

#### 1. What issues are eligible?
Returns and replacements are accepted if:
- The product received is damaged, physically broken, or has cosmetic defects significantly lower than the ordered condition grade.
- The delivered hardware or specifications (RAM, SSD, processor, screen) differ from the description.
- Hardware defects are observed during setup (e.g. screen flickering, non-functional keys, battery not charging).

#### 2. What is not eligible?
- Accidental physical drops, liquid spills, or electrical surges after delivery.
- Software modifications, unauthorized operating system re-installs, or BIOS tampering.
- Requests initiated after the 7-day delivery window has closed.

#### 3. How to initiate a return?
1. Go to **Help Center** > **Guided Support Flow**, or click **Need help with this order?** on your order details page.
2. Select your order and choose **Return, Replacement & Refund**.
3. Upload clear photos or a short video showing the issue.
4. For Cash-on-Delivery (COD) orders, enter your Bank Account or UPI details.
5. Our technical team approves the return within 24 hours and arranges doorstep pickup.

#### 4. Refund Timelines
- **Prepaid Orders (Cards, NetBanking, UPI):** Refund is automatically routed back to your original payment source within 5-7 business days via Razorpay.
- **Cash on Delivery (COD):** Transferred directly to your submitted Bank Account (NEFT/IMPS) or UPI within 3-5 business days of hub inspection. A traceable bank UTR reference will be displayed in your return dashboard.`,
        helpfulCount: 42,
        notHelpfulCount: 1,
        viewCount: 180,
        locale: 'en',
        category: { id: 'cat-returns', slug: 'returns-refunds', title: 'Returns, Replacement & Refunds', icon: 'RotateCcw' },
      },
      {
        id: 'art-warranty-terms',
        slug: '6-month-standard-warranty-coverage',
        title: 'What is covered under the Standard 6-Month Hardware Warranty?',
        summary: 'Details on motherboard, screen, battery and component coverage, plus repair procedure.',
        content: `### Standard 6-Month Hardware Warranty

Every laptop sold by LaptopMitra comes with a complimentary **6-Month (180-Day) Hardware Defects Warranty**.

#### What is covered:
- **Motherboard & Processor:** Logic board circuitry, integrated chips, GPU failure.
- **Display & Panel:** Internal screen panel failure, vertical/horizontal defect lines, backlight loss.
- **Battery & Charger:** Battery health dropping below standard operating capacity, charger adapter failure.
- **Keyboard & Touchpad:** Unresponsive keys, trackpad gesture sensor failure.

#### What is excluded:
- Normal cosmetic wear and tear accumulated during daily use.
- Damage resulting from liquid spillage, heavy impacts, drops, or fire.
- Opening the chassis or repairs attempted by non-authorized technicians.

#### How to claim warranty:
If your device encounters a hardware issue within 180 days:
1. Open a support ticket via **Help & Support** > **Warranty & Repair**.
2. Our hardware engineers diagnose the issue remotely or arrange a courier pickup for our central service lab.
3. Repaired units are tested against our 40-point checklist before being dispatched back to you at zero shipping charge.`,
        helpfulCount: 38,
        notHelpfulCount: 0,
        viewCount: 145,
        locale: 'en',
        category: { id: 'cat-warranty', slug: 'warranty-repair', title: '6-Month Warranty & Repair', icon: 'ShieldCheck' },
      },
      {
        id: 'art-buyback-guarantee',
        slug: 'lifetime-buyback-guarantee-scale',
        title: 'Lifetime Buyback Guarantee — Assured Value and Tenure Scale',
        summary: 'Learn how to claim guaranteed buyback value up to 36 months after purchase.',
        content: `### Lifetime Buyback Guarantee

We guarantee to buy back any laptop purchased on LaptopMitra anytime within 36 months of ownership!

#### Guaranteed Buyback Valuation Scale:
| Ownership Tenure | Assured Buyback Value (%) | Example for ₹30,000 Laptop |
| :--- | :--- | :--- |
| **0 – 6 Months** | **70%** | ₹21,000 |
| **6 – 12 Months** | **60%** | ₹18,000 |
| **12 – 18 Months** | **50%** | ₹15,000 |
| **18 – 24 Months** | **40%** | ₹12,000 |
| **24 – 36 Months** | **30%** | ₹9,000 |

#### Conditions for Buyback:
1. Device powers on normally and displays the operating system.
2. The original charger is provided (or a nominal fee is deducted for missing adapters).
3. Minor cosmetic signs of daily use are acceptable and expected. Severe body cracks or broken LCDs will receive an adjusted valuation.`,
        helpfulCount: 29,
        notHelpfulCount: 2,
        viewCount: 98,
        locale: 'en',
        category: { id: 'cat-buyback', slug: 'buyback-guarantee', title: 'Lifetime Buyback Guarantee', icon: 'Coins' },
      },
      {
        id: 'art-delivery-timeline',
        slug: 'delivery-timelines-and-tracking',
        title: 'How long does shipping take and how do I track my delivery?',
        summary: 'Standard 2-5 day pan-India delivery, tamper-proof packaging, and live courier tracking.',
        content: `### Shipping & Delivery Timelines

LaptopMitra delivers refurbished laptops securely across all serviceable pincodes in India.

- **Metro Cities (Delhi NCR, Bengaluru, Mumbai, Hyderabad, Chennai, Pune):** 2 to 3 business days.
- **Tier 2 & Tier 3 Cities:** 3 to 5 business days.
- **Northeast & Remote Locations:** 5 to 7 business days.

#### Safe & Tamper-Proof Packaging
Every laptop is packaged in our custom shock-absorbing foam chambers and sealed with a tamper-evident security tape.

#### How to track your shipment
As soon as your order is dispatched from our fulfillment center, you will receive an SMS and email notification containing the courier partner name (Bluedart, Delhivery, or Xpressbees) and the live tracking AWB number. You can also track your order live from your **Account > Orders** page.`,
        helpfulCount: 25,
        notHelpfulCount: 1,
        viewCount: 112,
        locale: 'en',
        category: { id: 'cat-orders', slug: 'orders-delivery', title: 'Orders & Pan-India Delivery', icon: 'Truck' },
      },
      {
        id: 'art-security-notice',
        slug: 'customer-security-and-anti-fraud-precautions',
        title: 'Important Security Alert: Protecting Yourself Against Fraud',
        summary: 'Learn what LaptopMitra representatives will never ask for and how to stay protected.',
        content: `### Customer Security & Fraud Warning Notice

Your digital safety is our highest priority. Please read and remember these essential security safeguards:

#### ⚠️ Golden Rules:
1. **Never share OTPs:** LaptopMitra agents will **NEVER** ask for your One-Time Password (OTP) received via SMS or email.
2. **Never share card numbers or CVV:** Payments must only be processed through our official secure Razorpay gateway on our website or mobile app.
3. **Never share UPI PIN:** Remember, **you NEVER need to enter your UPI PIN to receive money or refunds**. UPI PIN is only required to SEND money.
4. **Official Contact Channels:** LaptopMitra only communicates through our verified email addresses (@laptopmitra.com) and official support numbers listed in our Help Center.

If you suspect any fraudulent contact impersonating LaptopMitra, report it immediately via a ticket in our Help Center.`,
        helpfulCount: 56,
        notHelpfulCount: 0,
        viewCount: 230,
        locale: 'en',
        category: { id: 'cat-payments', slug: 'payments-security', title: 'Payments, Invoices & Safety', icon: 'CreditCard' },
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // 7. Admin / Staff Tickets Workspace
  // ---------------------------------------------------------------------------
  async exportAdminTicketsCsv(adminUserId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        ticketNumber: true,
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
        subject: true,
        category: true,
        issueType: true,
        type: true,
        status: true,
        priority: true,
        assignee: { select: { name: true } },
        firstResponseAt: true,
        resolvedAt: true,
        csatScore: true,
        csatComment: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'EXPORT_SUPPORT_TICKETS_CSV',
        entityType: 'SUPPORT_EXPORT',
        entityId: 'tickets',
        metadata: { rowCount: tickets.length },
      },
    });

    return toCsv(
      ['ticketNumber', 'customerName', 'customerEmail', 'orderNumber', 'subject', 'category', 'issueType', 'type', 'status', 'priority', 'assignee', 'firstResponseAt', 'resolvedAt', 'csatScore', 'csatComment', 'createdAt', 'updatedAt'],
      tickets.map((ticket) => [
        ticket.ticketNumber,
        ticket.user.name,
        ticket.user.email,
        ticket.order?.orderNumber,
        ticket.subject,
        ticket.category,
        ticket.issueType,
        ticket.type,
        ticket.status,
        ticket.priority,
        ticket.assignee?.name,
        ticket.firstResponseAt,
        ticket.resolvedAt,
        ticket.csatScore,
        ticket.csatComment,
        ticket.createdAt,
        ticket.updatedAt,
      ]),
    );
  }

  async exportAdminReturnsCsv(adminUserId: string) {
    const returns = await this.prisma.returnRequest.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        returnNumber: true,
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
        ticket: { select: { ticketNumber: true } },
        type: true,
        status: true,
        reason: true,
        refundAmount: true,
        refundMethod: true,
        manualRefundReference: true,
        razorpayRefundId: true,
        createdAt: true,
        approvedAt: true,
        pickedUpAt: true,
        processedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'EXPORT_SUPPORT_RETURNS_CSV',
        entityType: 'SUPPORT_EXPORT',
        entityId: 'returns',
        metadata: { rowCount: returns.length },
      },
    });

    return toCsv(
      ['returnNumber', 'customerName', 'customerEmail', 'orderNumber', 'ticketNumber', 'type', 'status', 'reason', 'refundAmount', 'refundMethod', 'manualRefundReference', 'razorpayRefundId', 'createdAt', 'approvedAt', 'pickedUpAt', 'processedAt'],
      returns.map((request) => [
        request.returnNumber,
        request.user.name,
        request.user.email,
        request.order.orderNumber,
        request.ticket?.ticketNumber,
        request.type,
        request.status,
        request.reason,
        request.refundAmount,
        request.refundMethod,
        request.manualRefundReference,
        request.razorpayRefundId,
        request.createdAt,
        request.approvedAt,
        request.pickedUpAt,
        request.processedAt,
      ]),
    );
  }

  async getAdminTickets(query: AdminTicketQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    const skip = (page - 1) * pageSize;

    const where: any = { isArchived: false };

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.category && query.category !== 'all') {
      where.category = query.category;
    }

    if (query.priority && query.priority !== 'all') {
      where.priority = query.priority;
    }

    if (query.assigneeId && query.assigneeId !== 'all') {
      if (query.assigneeId === 'unassigned') {
        where.assigneeId = null;
      } else {
        where.assigneeId = query.assigneeId;
      }
    }

    if (query.slaBreached === true || query.slaBreached === 'true') {
      where.OR = [
        { slaBreached: true },
        {
          status: 'NEW',
          firstResponseDueAt: { lt: new Date() },
          firstResponseAt: null,
        },
      ];
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.AND = [
        {
          OR: [
            { ticketNumber: { contains: q, mode: 'insensitive' } },
            { subject: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [total, items, openCount, breachedCount] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          assignee: {
            select: { id: true, name: true, email: true },
          },
          order: {
            select: { id: true, orderNumber: true, finalAmount: true, status: true },
          },
          _count: {
            select: { messages: true, attachments: true },
          },
        },
      }) as unknown as Promise<any[]>,
      this.prisma.supportTicket.count({
        where: {
          isArchived: false,
          status: { in: ['NEW', 'OPEN', 'WAITING_ON_CUSTOMER', 'IN_PROGRESS', 'REOPENED'] },
        },
      }),
      this.prisma.supportTicket.count({
        where: {
          isArchived: false,
          OR: [
            { slaBreached: true },
            {
              status: 'NEW',
              firstResponseDueAt: { lt: new Date() },
              firstResponseAt: null,
            },
          ],
        },
      }),
    ]);

    const mappedItems = (items as any[]).map((t: any) => {
      const isBreached =
        t.slaBreached || (t.status === 'NEW' && t.firstResponseDueAt && new Date() > t.firstResponseDueAt && !t.firstResponseAt);
      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        issueType: t.issueType,
        type: t.type,
        status: t.status,
        priority: t.priority,
        source: t.source,
        slaBreached: isBreached,
        firstResponseDueAt: t.firstResponseDueAt,
        firstResponseAt: t.firstResponseAt,
        resolvedAt: t.resolvedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        user: t.user,
        assignee: t.assignee,
        order: t.order,
        hasUnread: !!t.customerLastReadAt &&
          (!t.staffLastReadAt || t.customerLastReadAt > t.staffLastReadAt),
        messageCount: t._count.messages,
        attachmentCount: t._count.attachments,
        reopenCount: t.reopenCount,
        csatScore: t.csatScore,
      };
    });


    return {
      items: mappedItems,
      total,
      page,
      pageSize,
      openCount,
      breachedCount,
    };
  }

  async getAdminStaffUsers() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPPORT'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateAdminTicket(
    id: string,
    staffUserId: string,
    staffRole: string,
    dto: UpdateAdminTicketDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!ticket) throw new NotFoundException(`Ticket #${id} not found`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = { updatedAt: new Date(), staffLastReadAt: new Date() };
      const eventsToCreate: any[] = [];

      // Status change
      if (dto.status && dto.status !== ticket.status) {
        dataToUpdate.status = dto.status;
        if (dto.status === 'RESOLVED') {
          dataToUpdate.resolvedAt = new Date();
        }
        if (dto.status === 'CLOSED') {
          dataToUpdate.closedAt = new Date();
        }
        eventsToCreate.push({
          ticketId: id,
          actorUserId: staffUserId,
          actorRole: staffRole,
          eventType: 'STATUS_CHANGE',
          oldValue: ticket.status,
          newValue: dto.status,
          metadata: dto.adminNotes ? { note: dto.adminNotes } : undefined,
        });
      }

      // Priority change
      if (dto.priority && dto.priority !== ticket.priority) {
        dataToUpdate.priority = dto.priority;
        eventsToCreate.push({
          ticketId: id,
          actorUserId: staffUserId,
          actorRole: staffRole,
          eventType: 'PRIORITY_CHANGE',
          oldValue: ticket.priority,
          newValue: dto.priority,
        });
      }

      // Category change
      if (dto.category && dto.category !== ticket.category) {
        dataToUpdate.category = dto.category;
        eventsToCreate.push({
          ticketId: id,
          actorUserId: staffUserId,
          actorRole: staffRole,
          eventType: 'CATEGORY_CHANGE',
          oldValue: ticket.category,
          newValue: dto.category,
        });
      }

      // Assignee change
      if (dto.assigneeId !== undefined && dto.assigneeId !== ticket.assigneeId) {
        dataToUpdate.assigneeId = dto.assigneeId;
        eventsToCreate.push({
          ticketId: id,
          actorUserId: staffUserId,
          actorRole: staffRole,
          eventType: 'ASSIGNED',
          oldValue: ticket.assigneeId || 'UNASSIGNED',
          newValue: dto.assigneeId || 'UNASSIGNED',
        });
      }

      // First response tracking
      if (!ticket.firstResponseAt) {
        dataToUpdate.firstResponseAt = new Date();
      }

      const updated = await tx.supportTicket.update({
        where: { id },
        data: dataToUpdate,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          assignee: { select: { id: true, name: true, email: true } },
          order: { select: { id: true, orderNumber: true, finalAmount: true, status: true } },

        },
      });

      for (const ev of eventsToCreate) {
        await tx.ticketEvent.create({ data: ev });
      }

      return updated;
    });

    if (dto.status && dto.status !== ticket.status) {
      const notification =
        dto.status === 'RESOLVED'
          ? {
              type: 'ticket-resolved' as const,
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
            }
          : {
              type: 'ticket-status' as const,
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
              status: dto.status,
            };
      await this.notificationService?.dispatchSupportNotification(ticket.userId, notification);
    }
    return updated;
  }

  async mergeAdminTickets(
    sourceTicketId: string,
    targetTicketId: string,
    staffUserId: string,
    staffRole: string,
  ) {
    if (sourceTicketId === targetTicketId) {
      throw new BadRequestException('Cannot merge a ticket into itself');
    }

    const [source, target] = await Promise.all([
      this.prisma.supportTicket.findUnique({ where: { id: sourceTicketId } }),
      this.prisma.supportTicket.findUnique({ where: { id: targetTicketId } }),
    ]);

    if (!source) throw new NotFoundException(`Source ticket #${sourceTicketId} not found`);
    if (!target) throw new NotFoundException(`Target ticket #${targetTicketId} not found`);

    return this.prisma.$transaction(async (tx) => {
      // Update source
      await tx.supportTicket.update({
        where: { id: sourceTicketId },
        data: {
          status: 'MERGED',
          mergedIntoId: targetTicketId,
          closedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Events on source
      await tx.ticketEvent.create({
        data: {
          ticketId: sourceTicketId,
          actorUserId: staffUserId,
          actorRole: staffRole,
          eventType: 'MERGE',
          oldValue: source.status,
          newValue: 'MERGED',
          metadata: { targetTicketId, targetTicketNumber: target.ticketNumber },
        },
      });

      // Events on target
      await tx.ticketEvent.create({
        data: {
          ticketId: targetTicketId,
          actorUserId: staffUserId,
          actorRole: staffRole,
          eventType: 'MERGED_CHILD',
          newValue: source.ticketNumber,
          metadata: { sourceTicketId, sourceTicketNumber: source.ticketNumber },
        },
      });

      return {
        success: true,
        sourceTicketId,
        sourceTicketNumber: source.ticketNumber,
        targetTicketId,
        targetTicketNumber: target.ticketNumber,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Admin Returns Workspace & Actions
  // ---------------------------------------------------------------------------
  async getAdminReturns(query: AdminReturnQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { returnNumber: { contains: q, mode: 'insensitive' } },
        { manualRefundReference: { contains: q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, items, requestedCount] = await Promise.all([
      this.prisma.returnRequest.count({ where }),
      this.prisma.returnRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              finalAmount: true,

              paymentMethod: true,
              paymentStatus: true,
              status: true,
            },
          },
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: {
              orderItem: {
                include: {
                  product: { select: { id: true, name: true, sku: true } },
                },
              },
            },
          },
          ticket: {
            select: { id: true, ticketNumber: true, status: true },
          },
          _count: {
            select: { attachments: true },
          },
        },
      }),
      this.prisma.returnRequest.count({ where: { status: 'REQUESTED' } }),
    ]);

    // Mask sensitive details from list
    const sanitized = items.map((r) => {
      const { encryptedRefundDetails: _, ...rest } = r as any;
      return rest;
    });

    return {
      items: sanitized,
      total,
      page,
      pageSize,
      requestedCount,
    };
  }

  async getAdminReturnById(id: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            orderItem: {
              include: {
                product: true,
              },
            },
          },
        },
        ticket: {
          select: { id: true, ticketNumber: true, status: true, subject: true },
        },
        attachments: true,
        approver: { select: { id: true, name: true } },
        processor: { select: { id: true, name: true } },
      },
    });

    if (!returnRequest) throw new NotFoundException(`Return request #${id} not found`);

    // Mask sensitive details; decryption endpoint is available strictly for ADMIN
    const { encryptedRefundDetails: _, ...safeReturn } = returnRequest as any;
    return {
      ...safeReturn,
      hasEncryptedRefundDetails: !!returnRequest.encryptedRefundDetails,
    };
  }

  async processAdminReturn(
    id: string,
    staffUserId: string,
    staffRole: string,
    dto: ProcessAdminReturnDto,
  ) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!returnRequest) throw new NotFoundException(`Return request #${id} not found`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: dto.status,
        updatedAt: new Date(),
      };

      if (dto.adminNotes) updateData.adminNotes = dto.adminNotes;

      if (dto.status === 'APPROVED') {
        updateData.approvedBy = staffUserId;
        updateData.approvedAt = new Date();
      }

      if (dto.status === 'REJECTED') {
        updateData.adminNotes = dto.rejectionReason || dto.adminNotes || 'Return request rejected';
      }

      if (dto.pickupCourier || dto.pickupTrackingNumber) {
        updateData.pickupTrackingNumber = dto.pickupTrackingNumber || returnRequest.pickupTrackingNumber;
        updateData.pickupScheduledAt = new Date();
      }

      if (dto.status === 'PICKED_UP') {
        updateData.pickedUpAt = new Date();
      }

      if (dto.inspectionNotes) {
        updateData.inspectionNotes = dto.inspectionNotes;
      }

      if (dto.inspectionPassed !== undefined) {
        updateData.inspectionPassed = dto.inspectionPassed;
        if (dto.inspectionPassed === true) {
          // Automatic restock flag on passed inspection
          await tx.returnItem.updateMany({
            where: { returnRequestId: id },
            data: { restocked: true },
          });
        }
      }

      const updated = await tx.returnRequest.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          order: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Audit log entry for workflow transition
      await tx.auditLog.create({
        data: {
          actorUserId: staffUserId,
          action: `RETURN_${dto.status}`,
          entityType: 'RETURN_REQUEST',
          entityId: id,
          metadata: {
            adminNotes: dto.adminNotes,
            pickupTrackingNumber: dto.pickupTrackingNumber,
            inspectionPassed: dto.inspectionPassed,
          },
        },
      });

      return updated;
    });

    if (['APPROVED', 'REJECTED', 'PICKED_UP'].includes(dto.status)) {
      await this.notificationService?.dispatchSupportNotification(returnRequest.userId, {
        type: 'return-status',
        returnNumber: returnRequest.returnNumber,
        status: dto.status,
      });
    }
    return updated;
  }

  async processAdminRefund(
    id: string,
    adminUserId: string,
    dto: ProcessAdminRefundDto,
  ) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true, items: true },
    });

    if (!returnRequest) throw new NotFoundException(`Return request #${id} not found`);

    if (returnRequest.status === 'REFUNDED') {
      throw new BadRequestException('Return request has already been refunded');
    }

    const order = returnRequest.order;
    const isPrepaid = order.paymentMethod !== 'COD' && order.paymentMethod !== 'CASH_ON_DELIVERY';

    let razorpayRefundId: string | null = null;
    let manualRefundReference: string | null = dto.manualRefundReference || null;

    if (isPrepaid) {
      // Find razorpay payment ID
      const payment = await this.prisma.payment.findFirst({
        where: { orderId: order.id, status: 'COMPLETED' },
      });

      if (payment && payment.razorpayPaymentId && this.paymentService) {
        try {
          const refundResult = await this.paymentService.refundPayment(order.id, payment.razorpayPaymentId);
          razorpayRefundId = payment.razorpayPaymentId;
          this.logger.log(`Prepaid refund issued via Razorpay: ${JSON.stringify(refundResult)}`);
        } catch (err: any) {
          this.logger.warn(`Razorpay automated refund skipped/failed, recording manual audit: ${err.message}`);
        }
      }
    } else {
      if (!manualRefundReference) {
        throw new BadRequestException('A bank UTR / transfer reference is required for COD refunds');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          refundAmount: dto.refundAmount || returnRequest.refundAmount || order.finalAmount,
          razorpayRefundId: razorpayRefundId || returnRequest.razorpayRefundId,
          manualRefundReference,
          processedBy: adminUserId,
          processedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update order payment status
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          action: 'PROCESS_RETURN_REFUND',
          entityType: 'RETURN_REQUEST',
          entityId: id,
          metadata: {
            orderId: order.id,
            refundAmount: dto.refundAmount || Number(order.finalAmount),
            manualRefundReference,
            razorpayRefundId,
          },
        },
      });


      return res;
    });

    await this.notificationService?.dispatchSupportNotification(returnRequest.userId, {
      type: 'refund-reference',
      returnNumber: returnRequest.returnNumber,
      reference: updated.manualRefundReference || updated.razorpayRefundId || 'Refund processed',
    });
    return updated;
  }

  async decryptAdminRefundDetails(id: string, adminUserId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      select: { id: true, encryptedRefundDetails: true, returnNumber: true },
    });

    if (!returnRequest) throw new NotFoundException(`Return #${id} not found`);
    if (!returnRequest.encryptedRefundDetails) {
      throw new BadRequestException('No encrypted refund details found for this return');
    }

    // Decrypt details
    let decryptedStr: string;
    try {
      decryptedStr = this.encryptionService
        ? this.encryptionService.decrypt(returnRequest.encryptedRefundDetails)
        : returnRequest.encryptedRefundDetails;
    } catch (err: any) {
      throw new BadRequestException('Failed to decrypt refund details: Invalid key or payload corrupted');
    }

    // Audit log entry (MANDATORY)
    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'DECRYPT_REFUND_DETAILS',
        entityType: 'RETURN_REQUEST',
        entityId: id,
        metadata: { returnNumber: returnRequest.returnNumber },
      },
    });

    try {
      const parsed = JSON.parse(decryptedStr);
      return { success: true, details: parsed };
    } catch {
      return { success: true, details: { raw: decryptedStr } };
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Saved Replies CRUD
  // ---------------------------------------------------------------------------
  async getSavedReplies(category?: string) {
    const where: any = {};
    if (category && category !== 'all') where.category = category;

    return this.prisma.savedReply.findMany({
      where,
      orderBy: { shortcut: 'asc' },
    });
  }

  async createSavedReply(dto: SavedReplyDto) {
    if (!dto.shortcut?.trim()) throw new BadRequestException('Shortcut is required (e.g. /battery)');
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');
    if (!dto.content?.trim()) throw new BadRequestException('Content is required');

    const formattedShortcut = dto.shortcut.startsWith('/') ? dto.shortcut.trim() : `/${dto.shortcut.trim()}`;

    const existing = await this.prisma.savedReply.findUnique({
      where: { shortcut: formattedShortcut },
    });
    if (existing) {
      throw new BadRequestException(`Shortcut '${formattedShortcut}' already exists`);
    }

    return this.prisma.savedReply.create({
      data: {
        shortcut: formattedShortcut,
        title: dto.title.trim(),
        content: dto.content.trim(),
        category: dto.category?.trim() || null,
      },
    });
  }

  async updateSavedReply(id: string, dto: Partial<SavedReplyDto>) {
    const reply = await this.prisma.savedReply.findUnique({ where: { id } });
    if (!reply) throw new NotFoundException('Saved reply not found');

    const data: any = {};
    if (dto.shortcut) {
      data.shortcut = dto.shortcut.startsWith('/') ? dto.shortcut.trim() : `/${dto.shortcut.trim()}`;
    }
    if (dto.title) data.title = dto.title.trim();
    if (dto.content) data.content = dto.content.trim();
    if (dto.category !== undefined) data.category = dto.category?.trim() || null;

    return this.prisma.savedReply.update({
      where: { id },
      data,
    });
  }

  async deleteSavedReply(id: string) {
    const reply = await this.prisma.savedReply.findUnique({ where: { id } });
    if (!reply) throw new NotFoundException('Saved reply not found');

    await this.prisma.savedReply.delete({ where: { id } });
    return { success: true, message: 'Saved reply deleted' };
  }

  // ---------------------------------------------------------------------------
  // 10. Help Center Categories & Articles Admin Management
  // ---------------------------------------------------------------------------
  async getAdminHelpCategories() {
    return this.prisma.helpCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  async createAdminHelpCategory(dto: CreateHelpCategoryDto) {
    if (!dto.title?.trim()) throw new BadRequestException('Category title is required');
    if (!dto.slug?.trim()) throw new BadRequestException('Category slug is required');

    return this.prisma.helpCategory.create({
      data: {
        title: dto.title.trim(),
        slug: dto.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        icon: dto.icon?.trim() || 'HelpCircle',
        order: dto.order ?? 0,
        isActive: true,
      },
    });
  }

  async updateAdminHelpCategory(id: string, dto: UpdateHelpCategoryDto) {
    const cat = await this.prisma.helpCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Help category not found');
    if (dto.isActive === false) {
      throw new BadRequestException('Use the archive action to deactivate a category and unpublish its articles');
    }

    const data: any = {};
    if (dto.title) data.title = dto.title.trim();
    if (dto.slug) data.slug = dto.slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (dto.icon !== undefined) data.icon = dto.icon?.trim() || null;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.helpCategory.update({
      where: { id },
      data,
    });
  }

  async archiveAdminHelpCategory(id: string) {
    const cat = await this.prisma.helpCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Help category not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.helpArticle.updateMany({
        where: { categoryId: id },
        data: { isPublished: false },
      });
      await tx.helpCategory.update({
        where: { id },
        data: { isActive: false },
      });
    });
    return { success: true, message: 'Category archived and its articles unpublished' };
  }

  async getAdminHelpArticles() {
    return this.prisma.helpArticle.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: {
        category: {
          select: { id: true, title: true, slug: true, icon: true },
        },
      },
    });
  }

  async createAdminHelpArticle(dto: CreateHelpArticleDto) {
    if (!dto.categoryId) throw new BadRequestException('Category is required');
    if (!dto.title?.trim()) throw new BadRequestException('Article title is required');
    if (!dto.slug?.trim()) throw new BadRequestException('Article slug is required');
    if (!dto.content?.trim()) throw new BadRequestException('Content markdown is required');

    const category = await this.prisma.helpCategory.findUnique({
      where: { id: dto.categoryId },
      select: { isActive: true },
    });
    if (!category?.isActive) throw new BadRequestException('Articles can only be created in an active category');

    return this.prisma.helpArticle.create({
      data: {
        categoryId: dto.categoryId,
        title: dto.title.trim(),
        slug: dto.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        content: dto.content.trim(),
        summary: dto.summary?.trim() || null,
        isPublished: dto.isPublished ?? true,
        order: dto.order ?? 0,
      },
      include: { category: true },
    });
  }

  async updateAdminHelpArticle(id: string, dto: UpdateHelpArticleDto) {
    const article = await this.prisma.helpArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Help article not found');

    if (dto.isPublished) {
      const category = await this.prisma.helpCategory.findUnique({
        where: { id: dto.categoryId ?? article.categoryId },
        select: { isActive: true },
      });
      if (!category?.isActive) throw new BadRequestException('Articles can only be published in an active category');
    }

    const data: any = {};
    if (dto.categoryId) data.categoryId = dto.categoryId;
    if (dto.title) data.title = dto.title.trim();
    if (dto.slug) data.slug = dto.slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (dto.content) data.content = dto.content.trim();
    if (dto.summary !== undefined) data.summary = dto.summary?.trim() || null;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.order !== undefined) data.order = dto.order;

    return this.prisma.helpArticle.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async archiveAdminHelpArticle(id: string) {
    const article = await this.prisma.helpArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Help article not found');

    await this.prisma.helpArticle.update({
      where: { id },
      data: { isPublished: false },
    });
    return { success: true, message: 'Article unpublished and retained' };
  }

  // ---------------------------------------------------------------------------
  // 11. Support Settings
  // ---------------------------------------------------------------------------
  async getAdminSupportSettings() {
    let settings = await this.prisma.supportSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.supportSettings.create({
        data: {
          id: 'default',
          firstResponseSlaMinutes: 1440, // 24 hours
          autoCloseDays: 7,
          reopenWindowDays: 7,
          returnWindowDays: 7,
          supportHoursText: 'Monday to Saturday, 9:00 AM – 7:00 PM IST',
        },
      });
    }

    return settings;
  }

  async updateAdminSupportSettings(adminUserId: string, dto: UpdateSupportSettingsDto) {
    const existing = await this.getAdminSupportSettings();

    const data: any = {};
    if (dto.firstResponseSlaMinutes !== undefined) data.firstResponseSlaMinutes = dto.firstResponseSlaMinutes;
    if (dto.autoCloseDays !== undefined) data.autoCloseDays = dto.autoCloseDays;
    if (dto.reopenWindowDays !== undefined) data.reopenWindowDays = dto.reopenWindowDays;
    if (dto.supportHoursText !== undefined) data.supportHoursText = dto.supportHoursText;
    if (dto.returnWindowDays !== undefined) data.returnWindowDays = dto.returnWindowDays;
    if (dto.supportReturnApprovalLimit !== undefined) data.supportReturnApprovalLimit = dto.supportReturnApprovalLimit;

    const updated = await this.prisma.supportSettings.update({
      where: { id: existing.id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'UPDATE_SUPPORT_SETTINGS',
        entityType: 'SUPPORT_SETTINGS',
        entityId: 'default',
        metadata: dto as any,
      },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 12. Support Reports & Analytics
  // ---------------------------------------------------------------------------
  async getAdminSupportReports() {
    const [
      totalTickets,
      newTickets,
      openTickets,
      resolvedTickets,
      closedTickets,
      csatRatings,
      categories,
      totalReturns,
      returnsByStatus,
      returnsByReason,
      breachedCount,
    ] = await Promise.all([
      this.prisma.supportTicket.count({ where: { isArchived: false } }),
      this.prisma.supportTicket.count({ where: { status: 'NEW', isArchived: false } }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN', isArchived: false } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED', isArchived: false } }),
      this.prisma.supportTicket.count({ where: { status: 'CLOSED', isArchived: false } }),
      this.prisma.supportTicket.findMany({
        where: { csatScore: { not: null } },
        select: { csatScore: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { isArchived: false },
      }),
      this.prisma.returnRequest.count(),
      this.prisma.returnRequest.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.returnRequest.groupBy({
        by: ['reason'],
        _count: { id: true },
      }),
      this.prisma.supportTicket.count({
        where: {
          isArchived: false,
          OR: [
            { slaBreached: true },
            { status: 'NEW', firstResponseDueAt: { lt: new Date() }, firstResponseAt: null },
          ],
        },
      }),
    ]);

    // Calculate CSAT breakdown
    const csatDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let csatTotalScore = 0;
    for (const r of csatRatings) {
      if (r.csatScore && r.csatScore >= 1 && r.csatScore <= 5) {
        csatDistribution[r.csatScore] = (csatDistribution[r.csatScore] || 0) + 1;
        csatTotalScore += r.csatScore;
      }
    }
    const avgCsat = csatRatings.length > 0 ? Number((csatTotalScore / csatRatings.length).toFixed(1)) : 0;

    return {
      ticketVolume: {
        total: totalTickets,
        new: newTickets,
        open: openTickets,
        resolved: resolvedTickets,
        closed: closedTickets,
        breached: breachedCount,
      },
      csat: {
        averageScore: avgCsat,
        totalRated: csatRatings.length,
        distribution: csatDistribution,
      },
      categoriesBreakdown: categories.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      returnsOverview: {
        total: totalReturns,
        byStatus: returnsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
        byReason: returnsByReason.map((r) => ({ reason: r.reason, count: r._count.id })),
      },
    };
  }
}
