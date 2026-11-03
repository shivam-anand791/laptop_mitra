import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export const ALLOWED_LEASE_TENURES = [6, 12, 24] as const;

@Injectable()
export class LeaseService {
  private readonly logger = new Logger(LeaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates sequential lease contract number: LM-LC-XXXXXX
   */
  async generateContractNumber(tx?: any): Promise<string> {
    const client = tx || this.prisma;
    try {
      const seqResult = await client.$queryRaw<{ nextval: string }[]>`SELECT nextval('lease_contract_seq')::text as nextval`;
      const seq = seqResult[0]?.nextval || String(Date.now()).slice(-6);
      return `LM-LC-${seq.padStart(6, '0')}`;
    } catch {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      return `LM-LC-${randomSuffix}`;
    }
  }

  /**
   * Creates lease contracts and installment schedules for leased items in an order.
   * Runs atomically during order creation / confirmation.
   */
  async createLeaseContractsForOrder(orderId: string, tx?: any): Promise<any[]> {
    const client = tx || this.prisma;
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true },
        },
        rentalSubscription: true,
      },
    });

    if (!order) throw new NotFoundException(`Order with id ${orderId} not found`);

    const leaseItems = order.items.filter((it: any) => it.purchaseMode === 'lease');
    if (leaseItems.length === 0) return [];

    const createdContracts: any[] = [];

    for (const item of leaseItems) {
      // Check if contract already exists (idempotency)
      const existing = await client.leaseContract.findUnique({
        where: { orderItemId: item.id },
      });
      if (existing) {
        createdContracts.push(existing);
        continue;
      }

      // Validate tenure: 6, 12, or 24 months
      let tenure = item.tenureMonths || 6;
      if (![6, 12, 24].includes(tenure)) {
        tenure = 6;
      }

      const contractNumber = await this.generateContractNumber(client);
      const monthlyAmount = new Prisma.Decimal(item.price);
      const totalCommitment = monthlyAmount.mul(tenure);
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + tenure);

      const contract = await client.leaseContract.create({
        data: {
          contractNumber,
          orderId: order.id,
          orderItemId: item.id,
          userId: order.userId,
          productId: item.productId,
          tenureMonths: tenure,
          monthlyAmount,
          totalCommitment,
          startDate,
          endDate,
          status: 'ACTIVE',
          rentalSubscriptionId: order.rentalSubscription?.id || null,
        },
      });

      // Generate Installment Schedule
      // Installment 1: Month 1 advance charged at checkout (PAID)
      await client.leaseInstallment.create({
        data: {
          leaseContractId: contract.id,
          installmentNumber: 1,
          dueDate: startDate,
          amount: monthlyAmount,
          status: 'PAID',
          paidAt: startDate,
          paymentId: order.paymentId || null,
        },
      });

      // Installments 2..tenure: PENDING on subsequent calendar month boundaries
      for (let i = 2; i <= tenure; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));

        await client.leaseInstallment.create({
          data: {
            leaseContractId: contract.id,
            installmentNumber: i,
            dueDate,
            amount: monthlyAmount,
            status: 'PENDING',
          },
        });
      }

      // Record immutable creation event
      await client.leaseEvent.create({
        data: {
          leaseContractId: contract.id,
          actorId: order.userId,
          actorRole: 'CUSTOMER',
          eventType: 'CREATED',
          eventData: {
            contractNumber,
            tenureMonths: tenure,
            monthlyAmount: Number(monthlyAmount),
            totalCommitment: Number(totalCommitment),
          },
        },
      });

      createdContracts.push(contract);
    }

    return createdContracts;
  }

  /**
   * Get lease contracts for the authenticated customer.
   */
  async getCustomerContracts(userId: string): Promise<any[]> {
    return this.prisma.leaseContract.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, slug: true, images: true } },
        order: { select: { id: true, orderNumber: true, createdAt: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single lease contract details.
   */
  async getContractById(id: string, userId: string, userRole: string): Promise<any> {
    const contract = await this.prisma.leaseContract.findUnique({
      where: { id },
      include: {
        product: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            shippingAddress: true,
            createdAt: true,
          },
        },
        orderItem: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
        events: { orderBy: { createdAt: 'desc' } },
        rentalSubscription: true,
      },
    });

    if (!contract) throw new NotFoundException(`Lease contract ${id} not found`);
    if (userRole !== 'ADMIN' && userRole !== 'SUPPORT' && contract.userId !== userId) {
      throw new ForbiddenException('Access denied to this lease contract');
    }

    return contract;
  }

  /**
   * Customer requests a lease buyout quote.
   */
  async requestBuyout(contractId: string, userId: string): Promise<any> {
    const contract = await this.prisma.leaseContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new NotFoundException(`Lease contract ${contractId} not found`);
    if (contract.userId !== userId) throw new ForbiddenException('Access denied');
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot request buyout on ${contract.status} contract`);
    }

    // Record buyout request event
    await this.prisma.leaseEvent.create({
      data: {
        leaseContractId: contract.id,
        actorId: userId,
        actorRole: 'CUSTOMER',
        eventType: 'BUYOUT_REQUESTED',
        eventData: { requestedAt: new Date().toISOString() },
      },
    });

    return {
      message: 'Buyout request logged. Operations desk will review and provide an official buyout valuation quote.',
      contractId: contract.id,
    };
  }

  /**
   * Admin lists lease contracts with optional filtering.
   */
  async getAdminContracts(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.min(50, Math.max(1, Number(params?.limit || 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.LeaseContractWhereInput = {};
    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }
    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { contractNumber: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.leaseContract.count({ where }),
      this.prisma.leaseContract.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
          order: { select: { id: true, orderNumber: true } },
          installments: { select: { id: true, installmentNumber: true, status: true, amount: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin sets a manual buyout quote.
   */
  async setBuyoutQuote(
    contractId: string,
    adminId: string,
    data: { quoteAmount: number; validityDays?: number },
  ): Promise<any> {
    const contract = await this.prisma.leaseContract.findUnique({
      where: { id: contractId },
    });
    if (!contract) throw new NotFoundException(`Lease contract ${contractId} not found`);
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot quote buyout on contract in status ${contract.status}`);
    }

    const validityDays = data.validityDays || 15;
    const buyoutQuoteExpiresAt = new Date();
    buyoutQuoteExpiresAt.setDate(buyoutQuoteExpiresAt.getDate() + validityDays);

    const updated = await this.prisma.leaseContract.update({
      where: { id: contractId },
      data: {
        buyoutQuoteAmount: new Prisma.Decimal(data.quoteAmount),
        buyoutQuoteExpiresAt,
        buyoutStatus: 'QUOTED',
      },
    });

    await this.prisma.leaseEvent.create({
      data: {
        leaseContractId: contract.id,
        actorId: adminId,
        actorRole: 'ADMIN',
        eventType: 'BUYOUT_QUOTED',
        eventData: {
          quoteAmount: data.quoteAmount,
          validityDays,
          expiresAt: buyoutQuoteExpiresAt.toISOString(),
        },
      },
    });

    return updated;
  }

  /**
   * Complete buyout and transfer laptop ownership to customer.
   */
  async completeBuyout(
    contractId: string,
    adminId: string,
    data: { paymentReference: string; finalAmount?: number },
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.leaseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract) throw new NotFoundException(`Lease contract ${contractId} not found`);

      // Waive all remaining pending installments
      await tx.leaseInstallment.updateMany({
        where: {
          leaseContractId: contractId,
          status: 'PENDING',
        },
        data: { status: 'WAIVED' },
      });

      // Update contract to BOUGHT_OUT
      const updated = await tx.leaseContract.update({
        where: { id: contractId },
        data: {
          status: 'BOUGHT_OUT',
          buyoutStatus: 'PAID',
        },
      });

      // Log event
      await tx.leaseEvent.create({
        data: {
          leaseContractId: contract.id,
          actorId: adminId,
          actorRole: 'ADMIN',
          eventType: 'BUYOUT_COMPLETED',
          eventData: {
            paymentReference: data.paymentReference,
            finalAmount: data.finalAmount || Number(contract.buyoutQuoteAmount || 0),
          },
        },
      });

      return updated;
    });
  }

  /**
   * Terminate lease contract (returns device to LaptopMitra).
   */
  async terminateContract(contractId: string, adminId: string, reason: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.leaseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract) throw new NotFoundException(`Lease contract ${contractId} not found`);

      // Waive pending installments
      await tx.leaseInstallment.updateMany({
        where: {
          leaseContractId: contractId,
          status: 'PENDING',
        },
        data: { status: 'WAIVED' },
      });

      const updated = await tx.leaseContract.update({
        where: { id: contractId },
        data: { status: 'TERMINATED' },
      });

      await tx.leaseEvent.create({
        data: {
          leaseContractId: contract.id,
          actorId: adminId,
          actorRole: 'ADMIN',
          eventType: 'TERMINATED',
          eventData: { reason },
        },
      });

      return updated;
    });
  }
}

