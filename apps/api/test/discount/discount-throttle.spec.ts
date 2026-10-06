import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as http from 'http';
import { DiscountController } from '../../src/modules/discount/discount.controller';
import { DiscountService } from '../../src/modules/discount/discount.service';

describe('DiscountController Throttling (Rate Limiting)', () => {
  let app: INestApplication;
  let port: number;

  const mockDiscountService = {
    validateDiscount: jest.fn().mockImplementation((code: string) => {
      return Promise.resolve({
        valid: code === 'SAVE10',
        discountPercent: code === 'SAVE10' ? 10 : 0,
        discountAmount: code === 'SAVE10' ? 100 : 0,
        message: code === 'SAVE10' ? 'Coupon applied' : 'Invalid coupon code',
      });
    }),
    getReferralStats: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [DiscountController],
      providers: [
        {
          provide: DiscountService,
          useValue: mockDiscountService,
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
    const address = app.getHttpServer().address();
    port = typeof address === 'string' ? 0 : address.port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should enforce @Throttle limit of 10 and return 429 on 11th request', async () => {
    // The controller has @Throttle({ default: { limit: 10, ttl: 60000 } })
    // First 10 requests must succeed
    for (let i = 0; i < 10; i++) {
      const res = await postJson(port, '/discount/validate', { code: 'SAVE10', cartTotal: 1000 });
      expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(res.status);
    }

    // 11th request exceeds the limit and must receive 429 Too Many Requests
    const throttledRes = await postJson(port, '/discount/validate', { code: 'SAVE10', cartTotal: 1000 });
    expect(throttledRes.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });
});

function postJson(port: number, path: string, payload: any): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            body,
          });
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
