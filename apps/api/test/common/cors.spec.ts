import {
  parseCorsOrigins,
  isAllowedOrigin,
  createCorsOriginCallback,
} from '../../src/common/cors';

describe('CORS Security & Allowlist Tests', () => {
  describe('parseCorsOrigins', () => {
    it('correctly parses comma-separated list of origins and trims whitespace', () => {
      const parsed = parseCorsOrigins(' https://laptopmitra.com , https://admin.laptopmitra.com , ');
      expect(parsed).toEqual(['https://laptopmitra.com', 'https://admin.laptopmitra.com']);
    });

    it('returns empty array for null, undefined, or empty string', () => {
      expect(parseCorsOrigins(undefined)).toEqual([]);
      expect(parseCorsOrigins('')).toEqual([]);
      expect(parseCorsOrigins('   ')).toEqual([]);
    });
  });

  describe('isAllowedOrigin', () => {
    const devConfig = {
      configuredOrigins: ['https://laptopmitra.com'],
      isProduction: false,
    };

    const prodConfig = {
      configuredOrigins: ['https://laptopmitra.com', 'https://admin.laptopmitra.com'],
      isProduction: true,
    };

    it('allows requests with no Origin header (native mobile, curl, server-to-server)', () => {
      expect(isAllowedOrigin(undefined, devConfig)).toBe(true);
      expect(isAllowedOrigin(undefined, prodConfig)).toBe(true);
    });

    it('allows explicitly configured domains in production and development', () => {
      expect(isAllowedOrigin('https://laptopmitra.com', devConfig)).toBe(true);
      expect(isAllowedOrigin('https://laptopmitra.com', prodConfig)).toBe(true);
      expect(isAllowedOrigin('https://admin.laptopmitra.com', prodConfig)).toBe(true);
    });

    it('rejects attacker and arbitrary origins in both development and production (F2 fix)', () => {
      expect(isAllowedOrigin('https://attacker.example', devConfig)).toBe(false);
      expect(isAllowedOrigin('https://attacker.example', prodConfig)).toBe(false);
      expect(isAllowedOrigin('https://evil-site.com', prodConfig)).toBe(false);
      expect(isAllowedOrigin('http://localhost.attacker.com', devConfig)).toBe(false);
    });

    it('allows localhost and local dev origins in development mode only', () => {
      expect(isAllowedOrigin('http://localhost:3000', devConfig)).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:3000', devConfig)).toBe(true);
      expect(isAllowedOrigin('http://10.0.2.2:8081', devConfig)).toBe(true); // Android emulator
      expect(isAllowedOrigin('http://192.168.1.45:3000', devConfig)).toBe(true); // LAN Expo dev
    });

    it('rejects localhost origins in production unless explicitly configured', () => {
      expect(isAllowedOrigin('http://localhost:3000', prodConfig)).toBe(false);
      expect(isAllowedOrigin('http://127.0.0.1:3000', prodConfig)).toBe(false);
    });
  });

  describe('createCorsOriginCallback', () => {
    it('invokes callback(null, false) without throwing for disallowed origins', (done) => {
      const callbackFn = createCorsOriginCallback({
        configuredOrigins: ['https://laptopmitra.com'],
        isProduction: true,
      });

      callbackFn('https://attacker.example', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(false);
        done();
      });
    });

    it('invokes callback(null, true) for allowed origins', (done) => {
      const callbackFn = createCorsOriginCallback({
        configuredOrigins: ['https://laptopmitra.com'],
        isProduction: true,
      });

      callbackFn('https://laptopmitra.com', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
        done();
      });
    });
  });
});
