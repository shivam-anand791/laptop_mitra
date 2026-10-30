import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';
import { AdminController } from '../../src/modules/admin/admin.controller';
import { AdminService } from '../../src/modules/admin/admin.service';
import { SupportController } from '../../src/modules/support/support.controller';
import { SupportService } from '../../src/modules/support/support.service';
import { FirebaseService } from '../../src/firebase/firebase.service';
import { PaymentEncryptionService } from '../../src/common/encryption/payment-encryption.service';
import { PaymentService } from '../../src/modules/payments/payment.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ROLES_KEY } from '../../src/decorators/roles.decorator';
import { resetIntegrationDatabase } from './database';

type AdminRoute = {
  method: string;
  path: string;
  supportAllowed: boolean;
};

function getAdminRoutes(): AdminRoute[] {
  const controllers = [AdminController, SupportController];
  return controllers.flatMap((controller) => {
    const prefix = Reflect.getMetadata(PATH_METADATA, controller);
    return Object.getOwnPropertyNames(controller.prototype)
      .filter((name) => name !== 'constructor')
      .flatMap((name) => {
        const handler = controller.prototype[name];
        if (!Reflect.hasMetadata(PATH_METADATA, handler) || !Reflect.hasMetadata(METHOD_METADATA, handler)) {
          return [];
        }

        const route = Reflect.getMetadata(PATH_METADATA, handler);
        const path = `/${[prefix, route].flat().filter(Boolean).join('/')}`.replace(/\/+/g, '/');
        if (controller === SupportController && !path.includes('/admin/')) return [];

        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod;
        const method = RequestMethod[requestMethod];
        if (!method || method === 'ALL') return [];
        const roles = Reflect.getMetadata(ROLES_KEY, handler) as string[] | undefined;

        return [{
          method,
          path: path.replace(/:([a-zA-Z0-9_]+)/g, 'integration-id'),
          supportAllowed: controller === SupportController && Boolean(roles?.includes('SUPPORT')),
        }];
      });
  });
}

const adminRoutes = getAdminRoutes();
const serviceStub = new Proxy({}, {
  get: (_target, property) => property === 'then' ? undefined : async () => ({}),
});

describe('real Nest authorization guard integration sweep', () => {
  let app: INestApplication;
  let baseUrl: string;
  let supportToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FirebaseService)
      .useValue({
        verifyIdToken: async (token: string) => ({ uid: token }),
      })
      .overrideProvider(AdminService)
      .useValue(serviceStub)
      .overrideProvider(SupportService)
      .useValue(serviceStub)
      .overrideProvider(PaymentEncryptionService)
      .useValue({})
      .overrideProvider(PaymentService)
      .useValue(serviceStub)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const prisma = app.get(PrismaService);
    const suffix = Date.now();
    supportToken = `integration-support-${suffix}`;
    customerToken = `integration-customer-${suffix}`;
    await prisma.user.createMany({
      data: [
        {
          email: 'integration-support@example.test',
          firebaseUid: supportToken,
          referralCode: `IS${suffix}`,
          name: 'Integration Support',
          role: 'SUPPORT',
          status: 'ACTIVE',
        },
        {
          email: 'integration-customer@example.test',
          firebaseUid: customerToken,
          referralCode: `IC${suffix}`,
          name: 'Integration Customer',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      ],
    });

    await app.listen(0);
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('Test HTTP server did not bind to a TCP port.');
    baseUrl = `http://127.0.0.1:${address.port}`;

    expect(adminRoutes.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await app?.close();
    resetIntegrationDatabase();
  });

  async function request(route: AdminRoute, token?: string) {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (route.method !== 'GET' && route.method !== 'HEAD') headers['Content-Type'] = 'application/json';
    return fetch(`${baseUrl}${route.path}`, {
      method: route.method,
      headers,
      ...(route.method !== 'GET' && route.method !== 'HEAD' ? { body: '{}' } : {}),
    });
  }

  it.each(adminRoutes)('$method $path rejects unauthenticated requests', async (route) => {
    expect((await request(route)).status).toBe(401);
  });

  it.each(adminRoutes)('$method $path rejects CUSTOMER access', async (route) => {
    expect((await request(route, customerToken)).status).toBe(403);
  });

  it.each(adminRoutes)('$method $path enforces SUPPORT access policy', async (route) => {
    const response = await request(route, supportToken);
    expect(response.status).toBe(route.supportAllowed ? (route.method === 'POST' ? 201 : 200) : 403);
  });
});
