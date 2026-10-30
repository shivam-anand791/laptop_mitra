import { SupportService } from '../../src/modules/support/support.service';

describe('Support CSV exports', () => {
  const prisma: any = {
    supportTicket: { findMany: jest.fn() },
    returnRequest: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const service = new SupportService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports tickets and neutralizes spreadsheet formulas in customer text', async () => {
    prisma.supportTicket.findMany.mockResolvedValue([
      {
        ticketNumber: 'LM-T-1',
        user: { name: 'Customer', email: 'customer@example.test' },
        order: null,
        subject: '=HYPERLINK("https://example.test")',
        category: 'OTHER',
        issueType: null,
        type: 'QUERY',
        status: 'OPEN',
        priority: 'LOW',
        assignee: null,
        firstResponseAt: null,
        resolvedAt: null,
        csatScore: null,
        csatComment: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const csv = await service.exportAdminTicketsCsv('admin-1');

    expect(csv).toContain('"ticketNumber","customerName"');
    expect(csv).toContain(`"'=HYPERLINK(""https://example.test"")"`);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actorUserId: 'admin-1', metadata: { rowCount: 1 } }),
      }),
    );
    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    );
  });

  it('exports return references without selecting encrypted refund account details', async () => {
    prisma.returnRequest.findMany.mockResolvedValue([]);

    const csv = await service.exportAdminReturnsCsv('admin-1');

    expect(csv).toContain('"returnNumber","customerName"');
    const query = prisma.returnRequest.findMany.mock.calls[0][0];
    expect(query.select.encryptedRefundDetails).toBeUndefined();
    expect(query.select.refundAccountMasked).toBeUndefined();
  });
});
