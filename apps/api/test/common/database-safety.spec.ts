import {
  assertDevelopmentCatalogCount,
  getDevelopmentDatabaseName,
  assertRuntimeDatabaseTarget,
  assertSafeDatabaseTarget,
} from '../../src/common/database-safety';

describe('database safety guard', () => {
  const protectedHosts = ['supabase.example.com'];
  const runtimeProtectedHosts = ['aws-0-ap-northeast-2.pooler.supabase.com'];

  it('allows loopback database URLs', () => {
    expect(() => assertSafeDatabaseTarget({
      DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/db',
    }, protectedHosts)).not.toThrow();
  });

  it('rejects a protected host even if it is allowlisted', () => {
    expect(() => assertSafeDatabaseTarget({
      DATABASE_URL: 'postgresql://user:secret@supabase.example.com:5432/db',
      ALLOWED_DEV_DB_HOST: 'supabase.example.com',
    }, protectedHosts)).toThrow(/protected database host/);
  });

  it('checks DIRECT_URL as well as DATABASE_URL', () => {
    expect(() => assertSafeDatabaseTarget({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      DIRECT_URL: 'postgresql://user:secret@remote.example.com:5432/db',
    }, protectedHosts)).toThrow(/DIRECT_URL host/);
  });

  it('allows only an explicitly listed non-protected development host', () => {
    expect(() => assertSafeDatabaseTarget({
      DATABASE_URL: 'postgresql://user:pass@dev.example.com:5432/db',
      DIRECT_URL: 'postgresql://user:pass@dev.example.com:5432/db',
      ALLOWED_DEV_DB_HOST: 'dev.example.com',
    }, protectedHosts)).not.toThrow();
  });

  it('does not disclose credentials on malformed URL errors', () => {
    let message = '';
    try {
      assertSafeDatabaseTarget({
        DATABASE_URL: 'not-a-url-with-secret',
      }, protectedHosts);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toMatch(/DATABASE_URL is not a valid PostgreSQL URL/);
    expect(message).not.toContain('secret');
  });

  it('refuses to start development services when the catalog is empty', () => {
    expect(() => assertDevelopmentCatalogCount(0)).toThrow(
      'Development database is empty; run pnpm db:dev:seed.',
    );
    expect(() => assertDevelopmentCatalogCount(1)).not.toThrow();
  });

  it('uses the fresh local database by default and preserves explicit remote dev selection', () => {
    expect(getDevelopmentDatabaseName('127.0.0.1')).toBe('laptopmitra_dev_fresh');
    expect(getDevelopmentDatabaseName('dev.example.com')).toBeNull();
    expect(getDevelopmentDatabaseName('dev.example.com', 'laptopmitra_dev')).toBe('laptopmitra_dev');
    expect(() => getDevelopmentDatabaseName('localhost', 'bad-name')).toThrow(/PostgreSQL identifier/);
  });

  describe('API runtime target policy', () => {
    it('refuses the protected host on a laptop even with NODE_ENV=production', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
      }, runtimeProtectedHosts)).toThrow(/protected database host/);
    });

    it('allows the protected host only on Render production', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        RENDER: 'true',
        DATABASE_URL: 'postgresql://user:pass@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
      }, runtimeProtectedHosts)).not.toThrow();
    });

    it('logs the runtime classification with a masked host', () => {
      const log = jest.spyOn(console, 'info').mockImplementation();
      try {
        assertRuntimeDatabaseTarget({
          NODE_ENV: 'production',
          RENDER: 'true',
          DATABASE_URL: 'postgresql://user:pass@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
        }, runtimeProtectedHosts);
        expect(log).toHaveBeenCalledWith(
          '[DatabaseSafety] environment=render-production host=aws***.pooler.supabase.com decision=allow',
        );
      } finally {
        log.mockRestore();
      }
    });

    it('refuses loopback database hosts on Render production', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        RENDER: 'true',
        DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/postgres',
      }, runtimeProtectedHosts)).toThrow(/production DATABASE_URL must not target a loopback host/);
    });

    it('allows loopback database hosts in development', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/postgres',
      }, runtimeProtectedHosts)).not.toThrow();
    });
  });
});
