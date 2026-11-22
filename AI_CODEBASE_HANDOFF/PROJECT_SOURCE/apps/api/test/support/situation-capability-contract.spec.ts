import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from '../../src/modules/support/support.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PaymentEncryptionService } from '../../src/common/encryption/payment-encryption.service';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import {
  ACTION_HANDLERS_WEB,
  ACTION_HANDLERS_MOBILE,
  isActionImplemented,
} from '../../src/types';

describe('Situation Action Capability Contract Test (Stage 2 Enforce)', () => {
  let service: SupportService;
  let prisma: any;

  const mockItem = {
    id: 'item-101',
    orderId: 'ord-202',
    price: 49999,
    quantity: 1,
    status: 'ACTIVE',
    purchaseMode: 'sell',
    hasWarranty: true,
    order: {
      id: 'ord-202',
      orderNumber: 'LM-ORD-202',
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'prepaid',
      userId: 'usr-1',
      user: {
        id: 'usr-1',
        businessProfile: null,
      },
      deliveries: [],
      returnRequests: [],
    },
    product: {
      id: 'prod-1',
      name: 'Lenovo ThinkPad X1 Carbon Gen 10',
    },
    buybackRequests: [],
    leaseContract: null,
  };

  beforeEach(async () => {
    prisma = {
      orderItem: {
        findUnique: jest.fn().mockResolvedValue(mockItem),
      },
      buybackTier: {
        findMany: jest.fn().mockResolvedValue([
          { fromMonths: 0, toMonths: 6, percentage: 70, isActive: true },
          { fromMonths: 6, toMonths: 12, percentage: 60, isActive: true },
        ]),
      },
      buybackSettings: {
        findUnique: jest.fn().mockResolvedValue({ id: 'singleton', convenienceCharge: 0 }),
      },
      supportSettings: {
        findUnique: jest.fn().mockResolvedValue({ standardWarrantyDays: 180 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentEncryptionService, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('guarantees every action returned for web has a registered handler in ACTION_HANDLERS_WEB', async () => {
    const res = await service.getItemSituation(mockItem.id, 'usr-1', 'CUSTOMER', 'web');

    expect(res.actions.length).toBeGreaterThan(0);
    for (const act of res.actions) {
      expect(ACTION_HANDLERS_WEB).toContain(act.id);
      expect(isActionImplemented(act.id, 'web')).toBe(true);
    }
  });

  it('guarantees every action returned for mobile has a registered handler in ACTION_HANDLERS_MOBILE', async () => {
    const res = await service.getItemSituation(mockItem.id, 'usr-1', 'CUSTOMER', 'mobile');

    expect(res.actions.length).toBeGreaterThan(0);
    for (const act of res.actions) {
      expect(ACTION_HANDLERS_MOBILE).toContain(act.id);
      expect(isActionImplemented(act.id, 'mobile')).toBe(true);
    }
  });

  it('hides desktop-only actions (e.g. DOWNLOAD_INVOICE) when platform=mobile is requested', async () => {
    const webRes = await service.getItemSituation(mockItem.id, 'usr-1', 'CUSTOMER', 'web');
    const mobileRes = await service.getItemSituation(mockItem.id, 'usr-1', 'CUSTOMER', 'mobile');

    const webActionIds = webRes.actions.map((a) => a.id);
    const mobileActionIds = mobileRes.actions.map((a) => a.id);

    expect(webActionIds).toContain('DOWNLOAD_INVOICE');
    expect(mobileActionIds).not.toContain('DOWNLOAD_INVOICE');
  });

  it('ensures no disabled or unimplemented action is marked as enabled', async () => {
    const res = await service.getItemSituation(mockItem.id, 'usr-1', 'CUSTOMER', 'web');

    for (const act of res.actions) {
      if (act.enabled) {
        expect(isActionImplemented(act.id, 'web')).toBe(true);
        expect(act.disabledReason).toBeUndefined();
      } else {
        expect(act.disabledReason).toBeTruthy();
      }
    }
  });
});

