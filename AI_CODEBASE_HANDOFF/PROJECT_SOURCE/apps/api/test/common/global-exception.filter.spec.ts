import { BadRequestException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import {
  GlobalExceptionFilter,
  mapExceptionToHttpResponse,
} from '../../src/common/filters/global-exception.filter';
import {
  getFallbackMetrics,
  isCatalogFallbackAllowed,
  isFallbackResponse,
  markFallbackResponse,
  recordFallbackUsage,
  resetFallbackMetrics,
} from '../../src/common/fallback';
import { DataSourceHeaderInterceptor } from '../../src/common/interceptors/data-source-header.interceptor';
import { SchemaCompatibilityService } from '../../src/prisma/schema-compatibility.service';

describe('GlobalExceptionFilter & Error Mapping', () => {
  describe('mapExceptionToHttpResponse', () => {
    const requestId = 'req-test-1234';

    it('maps P2002 unique constraint conflict to 409 without leaking internals', () => {
      const err = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        clientVersion: '6.4.1',
        message: 'Unique constraint failed on the fields: (`cartId`,`lineKey`)',
        meta: { target: ['cartId', 'lineKey'] },
      };

      const res = mapExceptionToHttpResponse(err, requestId);
      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        code: 'UNIQUE_CONFLICT',
        message: 'A matching record already exists.',
        requestId,
      });
      expect(JSON.stringify(res.body)).not.toContain('lineKey');
    });

    it('maps P2003 foreign key error to 400 and P2025 missing record to 404', () => {
      const p2003 = mapExceptionToHttpResponse(
        { name: 'PrismaClientKnownRequestError', code: 'P2003', clientVersion: '6.4.1' },
        requestId,
      );
      expect(p2003.status).toBe(HttpStatus.BAD_REQUEST);
      expect(p2003.body.code).toBe('INVALID_REFERENCE');
      expect(p2003.body.requestId).toBe(requestId);

      const p2025 = mapExceptionToHttpResponse(
        { name: 'PrismaClientKnownRequestError', code: 'P2025', clientVersion: '6.4.1' },
        requestId,
      );
      expect(p2025.status).toBe(HttpStatus.NOT_FOUND);
      expect(p2025.body.code).toBe('RECORD_NOT_FOUND');
      expect(p2025.body.requestId).toBe(requestId);
    });

    it.each(['P2021', 'P2022'])(
      'maps schema drift error %s to 503 MIGRATIONS_PENDING without exposing column/table names',
      (code) => {
        const res = mapExceptionToHttpResponse(
          {
            name: 'PrismaClientKnownRequestError',
            code,
            clientVersion: '6.4.1',
            message: 'The column CartItem.allocatedDiscount does not exist',
            meta: { column: 'CartItem.allocatedDiscount' },
          },
          requestId,
        );

        expect(res.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(res.body.code).toBe('MIGRATIONS_PENDING');
        expect(res.body.requestId).toBe(requestId);
        expect(JSON.stringify(res.body)).not.toContain('allocatedDiscount');
      },
    );

    it.each(['P1001', 'P1002', 'P1008', 'P1017', 'P2024'])(
      'maps connection/pool error %s to 503 DATABASE_UNAVAILABLE',
      (code) => {
        const res = mapExceptionToHttpResponse(
          { name: 'PrismaClientKnownRequestError', code, clientVersion: '6.4.1' },
          requestId,
        );

        expect(res.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
        expect(res.body.requestId).toBe(requestId);
      },
    );

    it('maps PrismaClientInitializationError and PrismaClientRustPanicError to 503 DATABASE_UNAVAILABLE', () => {
      const initErr = new Error('Can not reach database server');
      initErr.name = 'PrismaClientInitializationError';
      expect(mapExceptionToHttpResponse(initErr, requestId)).toMatchObject({
        status: 503,
        body: { code: 'DATABASE_UNAVAILABLE', requestId },
      });

      const panicErr = new Error('panic');
      panicErr.name = 'PrismaClientRustPanicError';
      expect(mapExceptionToHttpResponse(panicErr, requestId)).toMatchObject({
        status: 503,
        body: { code: 'DATABASE_UNAVAILABLE', requestId },
      });
    });

    it('maps PrismaClientValidationError to 400 INVALID_INPUT', () => {
      const valErr = new Error('Invalid argument value');
      valErr.name = 'PrismaClientValidationError';
      const res = mapExceptionToHttpResponse(valErr, requestId);
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.body.code).toBe('INVALID_INPUT');
      expect(res.body.requestId).toBe(requestId);
    });

    it('preserves HttpException status & custom code while attaching requestId', () => {
      const httpErr = new ServiceUnavailableException({
        code: 'MIGRATIONS_PENDING',
        message: 'Schema update required',
      });
      const res = mapExceptionToHttpResponse(httpErr, requestId);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        statusCode: 503,
        code: 'MIGRATIONS_PENDING',
        message: 'Schema update required',
        requestId,
      });

      const badReq = new BadRequestException('Invalid quantity');
      const badRes = mapExceptionToHttpResponse(badReq, requestId);
      expect(badRes.status).toBe(400);
      expect(badRes.body.requestId).toBe(requestId);
    });

    it('masks unexpected Error internals and returns 500 with requestId', () => {
      const res = mapExceptionToHttpResponse(
        new Error('postgresql://postgres:supersecret@db.internal:5432'),
        requestId,
      );
      expect(res.status).toBe(500);
      expect(res.body.code).toBe('INTERNAL_ERROR');
      expect(res.body.requestId).toBe(requestId);
      expect(JSON.stringify(res.body)).not.toContain('supersecret');
    });
  });

  describe('GlobalExceptionFilter HTTP adapter', () => {
    it('sets X-Request-Id header and returns mapped JSON response', () => {
      const filter = new GlobalExceptionFilter();
      const setHeader = jest.fn();
      const json = jest.fn();
      const status = jest.fn(() => ({ json }));

      const host = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            originalUrl: '/cart',
            headers: { 'x-request-id': 'trace-abc-999' },
          }),
          getResponse: () => ({ setHeader, status }),
        }),
      } as any;

      filter.catch(
        { name: 'PrismaClientKnownRequestError', code: 'P2022', clientVersion: '6.4.1' },
        host,
      );

      expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'trace-abc-999');
      expect(status).toHaveBeenCalledWith(503);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          code: 'MIGRATIONS_PENDING',
          requestId: 'trace-abc-999',
        }),
      );
    });
  });

  describe('Fallback tracking & DataSourceHeaderInterceptor', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevAllowFallback = process.env.ALLOW_CATALOG_FALLBACK;

    beforeEach(() => {
      resetFallbackMetrics();
    });

    afterEach(() => {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevAllowFallback === undefined) delete process.env.ALLOW_CATALOG_FALLBACK;
      else process.env.ALLOW_CATALOG_FALLBACK = prevAllowFallback;
    });

    it('disables catalog fallback in production unless ALLOW_CATALOG_FALLBACK=true', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_CATALOG_FALLBACK;
      expect(isCatalogFallbackAllowed()).toBe(false);

      process.env.ALLOW_CATALOG_FALLBACK = 'true';
      expect(isCatalogFallbackAllowed()).toBe(true);
    });

    it('counts fallback metrics and sets X-Data-Source: fallback only on fallback responses', async () => {
      recordFallbackUsage('product.findAll');
      recordFallbackUsage('product.findAll');
      expect(getFallbackMetrics()).toEqual({ 'product.findAll': 2 });

      const interceptor = new DataSourceHeaderInterceptor();
      const setHeader = jest.fn();
      const ctx = {
        switchToHttp: () => ({
          getResponse: () => ({ setHeader }),
        }),
      } as any;

      const normalPayload = { products: [{ id: 'p1' }], total: 1 };
      expect(isFallbackResponse(normalPayload)).toBe(false);
      await lastValueFrom(interceptor.intercept(ctx, { handle: () => of(normalPayload) }));
      expect(setHeader).not.toHaveBeenCalled();

      const fallbackPayload = markFallbackResponse({ products: [{ id: 'mock' }], total: 1 });
      expect(isFallbackResponse(fallbackPayload)).toBe(true);
      expect(JSON.stringify(fallbackPayload)).toBe(JSON.stringify({ products: [{ id: 'mock' }], total: 1 }));
      await lastValueFrom(interceptor.intercept(ctx, { handle: () => of(fallbackPayload) }));
      expect(setHeader).toHaveBeenCalledWith('X-Data-Source', 'fallback');
    });
  });

  describe('SchemaCompatibilityService', () => {
    it('detects missing migrations and columns and gates feature routes with 503 MIGRATIONS_PENDING', async () => {
      const mockPrisma = {
        $queryRawUnsafe: jest.fn(async (sql: string) => {
          if (sql.includes('_prisma_migrations')) {
            return [{ migration_name: '20260101000000_init' }];
          }
          return [
            { table_name: 'CartItem', column_name: 'id' },
            { table_name: 'DiscountCode', column_name: 'code' },
          ];
        }),
      } as any;

      const svc = new SchemaCompatibilityService(mockPrisma);
      const status = await svc.refresh();

      expect(status.status).toBe('MIGRATIONS_PENDING');
      expect(status.pendingMigrations.length).toBeGreaterThan(0);
      expect(status.missingFeatures).toEqual(expect.arrayContaining(['cart', 'coupons', 'otp']));
      expect(() => svc.assertFeatureReady('cart')).toThrow(ServiceUnavailableException);
    });
  });
});

