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
    const renderEnvironment = {
      NODE_ENV: 'production',
      RENDER: 'true',
      DEPLOYMENT_ENV: 'production',
      PRODUCTION_DATABASE_HOST: 'aws-0-ap-northeast-2.pooler.supabase.com',
      DATABASE_URL: 'postgresql://aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
    };

    it('requires an explicit deployment environment', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        RENDER: 'true',
        DATABASE_URL: renderEnvironment.DATABASE_URL,
      }, runtimeProtectedHosts)).toThrow(/DEPLOYMENT_ENV must be/);
    });

    it('refuses the protected host on a laptop even with NODE_ENV=production', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        DEPLOYMENT_ENV: 'development',
        DATABASE_URL: 'postgresql://user:pass@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
      }, runtimeProtectedHosts)).toThrow(/protected database host/);
    });

    it('allows the protected host only on Render production', () => {
      expect(() => assertRuntimeDatabaseTarget(renderEnvironment, runtimeProtectedHosts)).not.toThrow();
    });

    it('refuses a production URL that does not match the explicitly approved host', () => {
      expect(() => assertRuntimeDatabaseTarget({
        ...renderEnvironment,
        DATABASE_URL: 'postgresql://other.example.com:5432/postgres',
      }, runtimeProtectedHosts)).toThrow(/must match PRODUCTION_DATABASE_HOST/);
    });

    it('refuses production service configuration on a Render pull-request preview', () => {
      expect(() => assertRuntimeDatabaseTarget({
        ...renderEnvironment,
        IS_PULL_REQUEST: 'true',
      }, runtimeProtectedHosts)).toThrow(/non-preview Render service/);
    });

    it('requires DIRECT_URL to use the same explicitly approved production host', () => {
      expect(() => assertRuntimeDatabaseTarget({
        ...renderEnvironment,
        DIRECT_URL: 'postgresql://other.example.com:5432/postgres',
      }, runtimeProtectedHosts)).toThrow(/production DIRECT_URL must match PRODUCTION_DATABASE_HOST/);
    });

    it('logs the runtime classification with a masked host', () => {
      const log = jest.spyOn(console, 'info').mockImplementation();
      try {
        assertRuntimeDatabaseTarget(renderEnvironment, runtimeProtectedHosts);
        expect(log).toHaveBeenCalledWith(
          '[DatabaseSafety] environment=production host=aws***.pooler.supabase.com decision=allow',
        );
      } finally {
        log.mockRestore();
      }
    });

    it('refuses loopback database hosts on Render production', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        RENDER: 'true',
        DEPLOYMENT_ENV: 'production',
        PRODUCTION_DATABASE_HOST: '127.0.0.1',
        DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/postgres',
      }, runtimeProtectedHosts)).toThrow(/PRODUCTION_DATABASE_HOST must not be a loopback host/);
    });

    it('allows loopback database hosts in development', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'development',
        DEPLOYMENT_ENV: 'development',
        DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/postgres',
      }, runtimeProtectedHosts)).not.toThrow();
    });

    it('refuses the production host from a test runtime', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'test',
        DEPLOYMENT_ENV: 'test',
        DATABASE_URL: renderEnvironment.DATABASE_URL,
      }, runtimeProtectedHosts)).toThrow(/protected database host/);
    });

    it('requires preview deployments to use a separately configured non-production host', () => {
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        RENDER: 'true',
        DEPLOYMENT_ENV: 'preview',
        NONPRODUCTION_DATABASE_HOST: 'preview-db.example.com',
        DATABASE_URL: renderEnvironment.DATABASE_URL,
      }, runtimeProtectedHosts)).toThrow(/must match NONPRODUCTION_DATABASE_HOST/);
      expect(() => assertRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        RENDER: 'true',
        DEPLOYMENT_ENV: 'preview',
        NONPRODUCTION_DATABASE_HOST: 'preview-db.example.com',
        DATABASE_URL: 'postgresql://preview-db.example.com:5432/app',
      }, runtimeProtectedHosts)).not.toThrow();
    });
  });
});
