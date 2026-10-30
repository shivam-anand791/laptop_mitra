#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertDevelopmentCatalogCount,
  assertSafeDatabaseTarget,
  loadDatabaseEnvironment,
} = require('../apps/api/scripts/database-safety.cjs');

const root = path.resolve(__dirname, '..');
const [, , environment, command, ...args] = process.argv;

function run(program, programArgs, options = {}) {
  const result = spawnSync(program, programArgs, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

function runPnpm(pnpmArgs) {
  if (process.platform !== 'win32') {
    run('pnpm', pnpmArgs);
    return;
  }

  const pnpmCli = path.resolve(process.env.APPDATA || '', 'npm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs');
  if (!fs.existsSync(pnpmCli)) {
    throw new Error('Could not locate pnpm.cjs for safe shell-free command execution.');
  }
  run(process.execPath, [pnpmCli, ...pnpmArgs]);
}

async function main() {
try {
  if (!['dev', 'test'].includes(environment)) {
    throw new Error('Usage: db-command.cjs <dev|test> <migrate|seed|reset|status|validate|diff|push|studio|test|payout|support-concurrency|history-check|api|web>');
  }

  loadDatabaseEnvironment(
    environment === 'dev' ? 'development' : 'test',
    environment === 'test' && command === 'integration' ? 'laptopmitra_test' : undefined,
  );
  if (environment === 'test') process.env.ALLOWED_DEV_DB_HOST = '';
  assertSafeDatabaseTarget();

  if (environment === 'dev' && ['api', 'web'].includes(command)) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      assertDevelopmentCatalogCount(await prisma.product.count());
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Development database is empty')) {
        throw error;
      }
      throw new Error('Could not verify the development catalog; check migrations and database availability.');
    } finally {
      await prisma.$disconnect();
    }
  }

  if (['migrate', 'reset', 'status', 'validate', 'diff', 'push', 'studio', 'seed'].includes(command)) {
    if (command === 'reset' && !args.includes('--confirm-reset')) {
      throw new Error('Refusing to reset the dev database without --confirm-reset.');
    }

    const prismaArgs = {
      migrate: ['migrate', 'deploy'],
      reset: ['migrate', 'reset', '--force'],
      status: ['migrate', 'status'],
      validate: ['validate'],
      diff: ['migrate', 'diff', '--from-schema-datamodel', 'prisma/schema.prisma', '--to-schema-datasource', 'prisma/schema.prisma', '--exit-code'],
      push: ['db', 'push'],
      studio: ['studio', '--schema', 'apps/api/prisma/schema.prisma'],
      seed: ['db', 'seed'],
    }[command];

    if (environment === 'dev' && process.env.DIRECT_URL && ['migrate', 'status', 'diff'].includes(command)) {
      process.env.DATABASE_URL = process.env.DIRECT_URL;
    }
    runPnpm(['--filter', 'api', 'exec', 'prisma', ...prismaArgs]);
  } else if (command === 'test') {
    runPnpm(['--filter', 'api', 'exec', 'jest', '--runInBand', ...args]);
  } else if (command === 'integration') {
    runPnpm(['--filter', 'api', 'exec', 'jest', '--config', 'jest.integration.config.js', '--runInBand', ...args]);
  } else if (command === 'payout') {
    runPnpm(['--filter', 'api', 'exec', 'ts-node', '-r', 'tsconfig-paths/register', 'scripts/test-payout-concurrency.ts']);
  } else if (command === 'support-concurrency') {
    runPnpm(['--filter', 'api', 'exec', 'ts-node', '-r', 'tsconfig-paths/register', 'scripts/test-support-concurrency.ts']);
  } else if (command === 'history-check') {
    runPnpm(['--filter', 'api', 'exec', 'ts-node', '-r', 'tsconfig-paths/register', 'scripts/test-support-history-constraints.ts']);
  } else if (command === 'api') {
    process.env.PORT = process.env.API_PORT || '3001';
    runPnpm(['--filter', 'api', 'run', 'start:dev']);
  } else if (command === 'web') {
    process.env.PORT = process.env.WEB_PORT || '3000';
    runPnpm(['--filter', 'web', 'run', 'dev']);
  } else {
    throw new Error(`Unknown database command "${command}".`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
}

void main();
