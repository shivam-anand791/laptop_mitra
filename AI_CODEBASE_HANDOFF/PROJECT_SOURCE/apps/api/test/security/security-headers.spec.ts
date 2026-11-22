import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import * as http from 'http';
import { AppController } from '../../src/app.controller';

describe('Security Headers (Helmet)', () => {
  let app: INestApplication;
  let port: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
      }),
    );
    await app.listen(0);
    const address = app.getHttpServer().address();
    port = typeof address === 'string' ? 0 : address.port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should set X-Content-Type-Options: nosniff', async () => {
    const res = await makeRequest(port, '/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set X-Frame-Options: SAMEORIGIN', async () => {
    const res = await makeRequest(port, '/health');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should set Cross-Origin-Resource-Policy: cross-origin', async () => {
    const res = await makeRequest(port, '/health');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('should remove or not expose X-Powered-By header', async () => {
    const res = await makeRequest(port, '/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

function makeRequest(port: number, path: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
      },
      (res) => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}
