import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { assertSafeDatabaseTarget, loadDatabaseEnvironment } from '../../src/common/database-safety';

const integrationDatabase = 'laptopmitra_test';
const apiRoot = resolve(__dirname, '../..');

export default async function globalSetup(): Promise<void> {
  loadDatabaseEnvironment('test', integrationDatabase);
  assertSafeDatabaseTarget();

  const targetUrl = new URL(process.env.DATABASE_URL || '');
  if (!['localhost', '127.0.0.1', '::1'].includes(targetUrl.hostname)) {
    throw new Error('Database safety error: integration database provisioning requires a loopback host.');
  }

  const adminUrl = new URL(targetUrl);
  adminUrl.pathname = '/postgres';
  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });

  try {
    const databases = await admin.$queryRaw<{ datname: string }[]>`
      SELECT datname FROM pg_database WHERE datname = ${integrationDatabase}
    `;
    if (databases.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${integrationDatabase}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  const result = spawnSync(
    process.execPath,
    [
      require.resolve('prisma'),
      'migrate',
      'deploy',
      '--schema',
      resolve(apiRoot, 'prisma/schema.prisma'),
    ],
    { cwd: apiRoot, env: process.env, stdio: 'inherit', shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('Could not apply migrations to the dedicated integration database.');
  }
  console.log('[Integration database] Created/verified laptopmitra_test and applied migrations.');
}
