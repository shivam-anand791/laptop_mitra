import { AppController } from '../src/app.controller';

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
});
