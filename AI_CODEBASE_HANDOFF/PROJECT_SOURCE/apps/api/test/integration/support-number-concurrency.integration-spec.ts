import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SupportService } from '../../src/modules/support/support.service';
import { resetIntegrationDatabase } from './database';

describe('PostgreSQL support and return number concurrency', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    resetIntegrationDatabase();
  });

  it('allocates unique ticket and return numbers across concurrent requests', async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        email: `numbers-${suffix}@example.test`,
        firebaseUid: `numbers-${suffix}`,
        referralCode: `N${suffix.replace(/-/g, '').slice(0, 10)}`,
        name: 'Integration Number User',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Integration Test Laptop',
        slug: `integration-test-${suffix}`,
        sku: `IT-${suffix}`,
        price: 100,
        stock: 1,
        status: 'ACTIVE',
      },
    });
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        subtotal: 100,
        finalAmount: 100,
        email: user.email,
      },
    });
    const item = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantity: 1,
        price: 100,
      },
    });
    const support = new SupportService(prisma as never);
    const total = 12;

    const tickets = await Promise.all(
      Array.from({ length: total }, (_, index) =>
        support.createTicket(user.id, {
          subject: `Concurrent integration ticket ${index}`,
          category: 'ORDER_DELIVERY',
          message: 'Ticket-number integration test',
        }),
      ),
    );
    expect(new Set(tickets.map((ticket) => ticket.ticketNumber)).size).toBe(total);

    const returns = await Promise.all(
      Array.from({ length: total }, () =>
        support.createReturnRequest(user.id, {
          orderId: order.id,
          reason: 'Return-number integration test',
          items: [{ orderItemId: item.id, quantity: 1 }],
        }),
      ),
    );
    expect(new Set(returns.map((request) => request.returnNumber)).size).toBe(total);
  });
});
