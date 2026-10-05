import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as http from 'http';
import { AppController } from '../../src/app.controller';

class MockConfigService {
  constructor(private readonly env: Record<string, string | undefined>) {}
  get(key: string, defaultValue?: any) {
    return this.env[key] !== undefined ? this.env[key] : defaultValue;
  }
}

describe('Swagger Production Protection (/api)', () => {
  jest.setTimeout(15000);
  let app: INestApplication;

  const createTestApp = async (nodeEnv: string, enableSwagger?: string) => {
    const configService = new MockConfigService({
      NODE_ENV: nodeEnv,
      ENABLE_SWAGGER: enableSwagger,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    const testApp = moduleFixture.createNestApplication();
    const isProduction = configService.get('NODE_ENV') === 'production';
    const isSwaggerEnabled = configService.get('ENABLE_SWAGGER') === 'true';

    if (!isProduction || isSwaggerEnabled) {
      const config = new DocumentBuilder()
        .setTitle('LaptopMitra API')
        .setDescription('API for LaptopMitra')
        .setVersion('1.0')
        .build();
      const document = SwaggerModule.createDocument(testApp, config);
      SwaggerModule.setup('api', testApp, document);
    }

    await testApp.listen(0);
    const address = testApp.getHttpServer().address();
    const testPort = typeof address === 'string' ? 0 : address.port;
    return { testApp, testPort };
  };

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 404 for /api in production mode when ENABLE_SWAGGER is unset', async () => {
    const setup = await createTestApp('production', undefined);
    app = setup.testApp;

    const res = await makeRequest(setup.testPort, '/api');
    expect(res.status).toBe(404);
  });

  it('returns 404 for /api in production mode when ENABLE_SWAGGER is false', async () => {
    const setup = await createTestApp('production', 'false');
    app = setup.testApp;

    const res = await makeRequest(setup.testPort, '/api');
    expect(res.status).toBe(404);
  });

  it('mounts Swagger on /api when ENABLE_SWAGGER=true in production', async () => {
    const setup = await createTestApp('production', 'true');
    app = setup.testApp;

    const res = await makeRequest(setup.testPort, '/api');
    expect([200, 301, 302]).toContain(res.status);
  });

  it('mounts Swagger on /api in development mode', async () => {
    const setup = await createTestApp('development', undefined);
    app = setup.testApp;

    const res = await makeRequest(setup.testPort, '/api');
    expect([200, 301, 302]).toContain(res.status);
  });
});

function makeRequest(
  port: number,
  path: string,
): Promise<{ status: number; headers: Record<string, string | string[] | undefined> }> {
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
