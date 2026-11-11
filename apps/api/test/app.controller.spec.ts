import 'reflect-metadata';
import { HTTP_CODE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AppController } from '../src/app.controller';
import { PUBLIC_ROUTE_KEY } from '../src/decorators/public.decorator';

describe('AppController (/health)', () => {
  it('returns capabilities as empty by default when ENABLE_EMAIL_VERIFICATION is off', () => {
    const configService = {
      get: jest.fn((key: string) => (key === 'ENABLE_EMAIL_VERIFICATION' ? 'false' : undefined)),
    };
    const controller = new AppController(configService as any);
    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.version).toBe('1.0.0');
    expect(result.capabilities).toEqual([]);
  });

  it('advertises email-verification capability when ENABLE_EMAIL_VERIFICATION is true', () => {
    const configService = {
      get: jest.fn((key: string) => (key === 'ENABLE_EMAIL_VERIFICATION' ? 'true' : undefined)),
    };
    const controller = new AppController(configService as any);
    const result = controller.getHealth();

    expect(result.capabilities).toContain('email-verification');
  });

  it('returns ready status, database connected, and mail status for /health/ready', async () => {
    const configService = {
      get: jest.fn(() => undefined),
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };
    const mailService = {
      getHealthStatus: jest.fn().mockReturnValue('ok'),
    };
    const controller = new AppController(configService as any, prisma as any, mailService as any);
    const result = await controller.getReadiness();

    expect(result.status).toBe('ready');
    expect(result.database).toBe('connected');
    expect(result.mail).toBe('ok');
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('reports mail status as degraded when mail provider is degraded', async () => {
    const configService = {
      get: jest.fn(() => undefined),
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };
    const mailService = {
      getHealthStatus: jest.fn().mockReturnValue('degraded'),
    };
    const controller = new AppController(configService as any, prisma as any, mailService as any);
    const result = await controller.getReadiness();

    expect(result.mail).toBe('degraded');
  });

  it('reports mail status as not configured when mailService is absent', async () => {
    const configService = {
      get: jest.fn(() => undefined),
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };
    const controller = new AppController(configService as any, prisma as any);
    const result = await controller.getReadiness();

    expect(result.mail).toBe('not configured');
  });

  it('serves GET /favicon.ico publicly with 204 No Content to prevent browser console 404s', () => {
    const handler = AppController.prototype.getFavicon;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('favicon.ico');
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(204);
    expect(Reflect.getMetadata(PUBLIC_ROUTE_KEY, handler)).toBe(true);
    expect(new AppController().getFavicon()).toBeUndefined();
  });
});
