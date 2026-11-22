import { assertSafeDatabaseTarget, loadDatabaseEnvironment } from '../src/common/database-safety';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupportService } from '../src/modules/support/support.service';

async function main() {
  loadDatabaseEnvironment('development');
  assertSafeDatabaseTarget();

  const prisma = new PrismaService();
  const suffix = Date.now().toString();
  const userId = `support-concurrency-${suffix}`;
  const orderId = `return-concurrency-${suffix}`;
  let orderItemId: string | undefined;
  let preserveFixtures = false;

  try {
    await prisma.$connect();
    const product = await prisma.product.findFirst({ select: { id: true } });
    if (!product) throw new Error('Dev catalog is empty; run pnpm db:dev:seed first.');

    await prisma.user.create({
      data: {
        id: userId,
        email: `support-concurrency-${suffix}@example.test`,
        firebaseUid: `local-concurrency-${suffix}`,
        referralCode: `LC${suffix}`,
        name: 'Local Concurrency Test',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId,
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        subtotal: 100,
        finalAmount: 100,
        email: `support-concurrency-${suffix}@example.test`,
      },
    });

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantity: 1,
        price: 100,
      },
    });
    orderItemId = orderItem.id;

    const support = new SupportService(prisma);
    const total = 12;

    preserveFixtures = true;
    const tickets = await Promise.all(
      Array.from({ length: total }, (_, index) => support.createTicket(userId, {
        subject: `Concurrent ticket ${index}`,
        category: 'ORDER_DELIVERY',
        message: 'Local concurrency verification',
      })),
    );
    const ticketNumbers = new Set(tickets.map((ticket) => ticket.ticketNumber));
    if (ticketNumbers.size !== total) {
      throw new Error(`Ticket number collision: expected ${total} unique numbers, got ${ticketNumbers.size}.`);
    }
    console.log(`Ticket number concurrency: ${tickets.length}/${total} unique ticket numbers.`);

    const returns = await Promise.all(
      Array.from({ length: total }, () => support.createReturnRequest(userId, {
        orderId: order.id,
        reason: 'Local concurrency verification',
        items: [{ orderItemId: orderItem.id, quantity: 1 }],
      })),
    );
    const returnNumbers = new Set(returns.map((request) => request.returnNumber));
    if (returnNumbers.size !== total) {
      throw new Error(`Return number collision: expected ${total} unique numbers, got ${returnNumbers.size}.`);
    }
    console.log(`Return number concurrency: ${returns.length}/${total} unique return numbers.`);
  } finally {
    if (!preserveFixtures) {
      if (orderItemId) await prisma.orderItem.delete({ where: { id: orderItemId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } else {
      console.log('Support history and linked test fixtures retained by design.');
    }
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Support concurrency checks failed:', error);
  process.exitCode = 1;
});
