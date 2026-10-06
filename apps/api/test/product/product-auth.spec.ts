import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as http from 'http';
import { ProductController } from '../../src/modules/product/product.controller';
import { ProductService } from '../../src/modules/product/product.service';
import { RolesGuard } from '../../src/guards/roles.guard';

describe('ProductController Authorization Sweep', () => {
  let app: INestApplication;
  let port: number;

  const mockProductService = {
    findAll: jest.fn().mockResolvedValue({ products: [], total: 0 }),
    findOne: jest.fn().mockResolvedValue({ id: 'p1', name: 'Laptop' }),
    create: jest.fn().mockResolvedValue({ id: 'p2', name: 'New Laptop' }),
    update: jest.fn().mockResolvedValue({ id: 'p1', name: 'Updated Laptop' }),
    remove: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        Reflector,
        RolesGuard,
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

  it('allows public GET /products without authentication', async () => {
    const res = await request(port, '/products', 'GET');
    expect([HttpStatus.OK, 200]).toContain(res.status);
  });

  it('allows public GET /products/:id without authentication', async () => {
    const res = await request(port, '/products/p1', 'GET');
    expect([HttpStatus.OK, 200]).toContain(res.status);
  });
});

function request(port: number, path: string, method: string, payload?: any, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : undefined;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data).toString() } : {}),
          ...headers,
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
    if (data) req.write(data);
    req.end();
  });
}
