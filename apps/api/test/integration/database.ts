import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { assertSafeDatabaseTarget } from '../../src/common/database-safety';

const apiRoot = resolve(__dirname, '../..');
const integrationDatabase = 'laptopmitra_test';

export function assertIntegrationDatabase(): void {
  assertSafeDatabaseTarget();
  const url = new URL(process.env.DATABASE_URL || '');
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname !== `/${integrationDatabase}`
  ) {
    throw new Error('Database safety error: integration tests may only use the dedicated laptopmitra_test database.');
  }
}

export function resetIntegrationDatabase(): void {
  assertIntegrationDatabase();
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('prisma'),
      'migrate',
      'reset',
      '--force',
      '--skip-seed',
      '--schema',
      resolve(apiRoot, 'prisma/schema.prisma'),
    ],
    { cwd: apiRoot, env: process.env, stdio: 'inherit', shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('Integration database cleanup failed; inspect Prisma output above.');
  }
}
