import { Prisma, PrismaClient } from '@prisma/client';
import { assertSafeDatabaseTarget, loadDatabaseEnvironment } from '../src/common/database-safety';

type Transaction = Prisma.TransactionClient;

const prisma = new PrismaClient();
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let caseNumber = 0;

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function isAppendOnlyError(error: unknown): boolean {
  return error instanceof Error && /append-only/i.test(error.message);
}

async function expectRollback(
  label: string,
  prepare: (tx: Transaction) => Promise<() => Promise<unknown>>,
  isExpectedFailure: (error: unknown) => boolean,
): Promise<void> {
  const rollback = new Error(`Expected rollback for ${label}`);
  const unexpectedSuccess = new Error(`${label} unexpectedly succeeded`);

  try {
    await prisma.$transaction(async (tx) => {
      const mutate = await prepare(tx);
      try {
        await mutate();
      } catch (error) {
        if (!isExpectedFailure(error)) throw error;
        throw rollback;
      }
      throw unexpectedSuccess;
    });
  } catch (error) {
    if (error === unexpectedSuccess) throw error;
    if (error !== rollback) throw error;
  }

  caseNumber += 1;
  console.log(`PASS ${label}`);
}

async function createUser(tx: Transaction, label: string) {
  return tx.user.create({
    data: {
      id: `${label}-${suffix}`,
      email: `${label}-${suffix}@example.test`,
      firebaseUid: `${label}-${suffix}`,
      referralCode: `${label}-${suffix}`,
      name: 'Local History Constraint Test',
    },
  });
}

async function createOrder(tx: Transaction, userId: string, label: string) {
  return tx.order.create({
    data: {
      id: `${label}-${suffix}`,
      userId,
      subtotal: 100,
      finalAmount: 100,
      email: `${label}-${suffix}@example.test`,
    },
  });
}

async function createTicket(tx: Transaction, userId: string, label: string, orderId?: string) {
  return tx.supportTicket.create({
    data: {
      ticketNumber: `${label}-${suffix}`,
      userId,
      ...(orderId ? { orderId } : {}),
      subject: 'History preservation test',
      category: 'ORDER_DELIVERY',
    },
  });
}

async function run(): Promise<void> {
  loadDatabaseEnvironment('development');
  assertSafeDatabaseTarget();
  await prisma.$connect();

  try {
    const foreignKeys = await prisma.$queryRaw<Array<{
      table_name: string;
      column_name: string;
      referenced_table: string;
      referenced_column: string;
      delete_rule: string;
    }>>`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS referenced_table,
             ccu.column_name AS referenced_column, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_catalog = kcu.constraint_catalog
       AND tc.constraint_schema = kcu.constraint_schema
       AND tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_catalog = ccu.constraint_catalog
       AND tc.constraint_schema = ccu.constraint_schema
       AND tc.constraint_name = ccu.constraint_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_catalog = rc.constraint_catalog
       AND tc.constraint_schema = rc.constraint_schema
       AND tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_schema = current_schema()
        AND tc.table_name IN (
          'Payment', 'Referral', 'DiscountRedemption', 'ReferralRedemption',
          'AffiliatePaymentDetails', 'WithdrawalRequest', 'SupportTicket',
          'TicketMessage', 'TicketAttachment', 'TicketEvent', 'ReturnRequest',
          'ReturnItem', 'HelpArticle'
        )
      ORDER BY tc.table_name, kcu.column_name
    `;
    console.log('Verified support and ledger foreign keys:');
    for (const fk of foreignKeys) {
      console.log(
        `  ${fk.table_name}.${fk.column_name} -> ${fk.referenced_table}.${fk.referenced_column}: ON DELETE ${fk.delete_rule}`,
      );
    }
    const restrictedRelations = [
      'SupportTicket.orderId',
      'SupportTicket.orderItemId',
      'SupportTicket.mergedIntoId',
      'TicketMessage.ticketId',
      'TicketAttachment.ticketId',
      'TicketAttachment.returnRequestId',
      'TicketAttachment.messageId',
      'TicketEvent.ticketId',
      'ReturnRequest.ticketId',
      'ReturnItem.returnRequestId',
      'DiscountRedemption.orderId',
      'ReferralRedemption.orderId',
      'AffiliatePaymentDetails.userId',
      'HelpArticle.categoryId',
    ];
    const deleteRules = new Map(
      foreignKeys.map((fk) => [`${fk.table_name}.${fk.column_name}`, fk.delete_rule]),
    );
    for (const relation of restrictedRelations) {
      if (deleteRules.get(relation) !== 'RESTRICT') {
        throw new Error(`${relation} must use ON DELETE RESTRICT`);
      }
    }

    const product = await prisma.product.findFirst({ select: { id: true } });
    if (!product) throw new Error('Dev catalog is empty; run pnpm db:dev:seed first.');

    await expectRollback('ticket delete blocked by message history', async (tx) => {
      const user = await createUser(tx, 'ticket-message-user');
      const ticket = await createTicket(tx, user.id, 'ticket-message');
      await tx.ticketMessage.create({
        data: { ticketId: ticket.id, body: 'Keep this history' },
      });
      return () => tx.supportTicket.delete({ where: { id: ticket.id } });
    }, (error) => isPrismaCode(error, 'P2003'));

    await expectRollback('return delete blocked by return items', async (tx) => {
      const user = await createUser(tx, 'return-item-user');
      const order = await createOrder(tx, user.id, 'return-item-order');
      const orderItem = await tx.orderItem.create({
        data: { orderId: order.id, productId: product.id, quantity: 1, price: 100 },
      });
      const request = await tx.returnRequest.create({
        data: {
          returnNumber: `RET-${suffix}`,
          orderId: order.id,
          userId: user.id,
          reason: 'History preservation test',
        },
      });
      await tx.returnItem.create({
        data: {
          returnRequestId: request.id,
          orderItemId: orderItem.id,
          unitPrice: 100,
        },
      });
      return () => tx.returnRequest.delete({ where: { id: request.id } });
    }, (error) => isPrismaCode(error, 'P2003'));

    await expectRollback('order delete blocked by ticket history', async (tx) => {
      const user = await createUser(tx, 'order-ticket-user');
      const order = await createOrder(tx, user.id, 'order-ticket-order');
      await createTicket(tx, user.id, 'order-ticket', order.id);
      return () => tx.order.delete({ where: { id: order.id } });
    }, (error) => isPrismaCode(error, 'P2003'));

    await expectRollback('order delete blocked by discount ledger', async (tx) => {
      const user = await createUser(tx, 'discount-ledger-user');
      const order = await createOrder(tx, user.id, 'discount-ledger-order');
      const discount = await tx.discountCode.create({
        data: {
          code: `TEST-${suffix}`,
          name: 'History preservation test',
          type: 'fixed',
          value: 10,
        },
      });
      await tx.discountRedemption.create({
        data: { orderId: order.id, userId: user.id, discountCodeId: discount.id },
      });
      return () => tx.order.delete({ where: { id: order.id } });
    }, (error) => isPrismaCode(error, 'P2003'));

    await expectRollback('order delete blocked by referral ledger', async (tx) => {
      const referrer = await createUser(tx, 'referral-ledger-referrer');
      const referred = await createUser(tx, 'referral-ledger-referred');
      const order = await createOrder(tx, referred.id, 'referral-ledger-order');
      await tx.referralRedemption.create({
        data: {
          referrerUserId: referrer.id,
          referredUserId: referred.id,
          orderId: order.id,
          referralCode: referrer.referralCode,
          discountAmount: 10,
        },
      });
      return () => tx.order.delete({ where: { id: order.id } });
    }, (error) => isPrismaCode(error, 'P2003'));

    for (const operation of ['update', 'delete'] as const) {
      await expectRollback(`TicketEvent ${operation} blocked`, async (tx) => {
        const user = await createUser(tx, `event-${operation}-user`);
        const ticket = await createTicket(tx, user.id, `event-${operation}`);
        const event = await tx.ticketEvent.create({
          data: { ticketId: ticket.id, eventType: 'CREATED' },
        });
        if (operation === 'update') {
          return () => tx.ticketEvent.update({ where: { id: event.id }, data: { oldValue: 'changed' } });
        }
        return () => tx.ticketEvent.delete({ where: { id: event.id } });
      }, isAppendOnlyError);

      await expectRollback(`AuditLog ${operation} blocked`, async (tx) => {
        const log = await tx.auditLog.create({
          data: {
            action: 'HISTORY_CONSTRAINT_TEST',
            entityType: 'TEST',
            entityId: suffix,
          },
        });
        if (operation === 'update') {
          return () => tx.auditLog.update({ where: { id: log.id }, data: { action: 'CHANGED' } });
        }
        return () => tx.auditLog.delete({ where: { id: log.id } });
      }, isAppendOnlyError);
    }

    console.log(`History constraint checks passed: ${caseNumber} cases.`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error('Support history constraint checks failed:', error);
  process.exitCode = 1;
});
