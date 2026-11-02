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
});

