#!/usr/bin/env node

process.env.TS_NODE_COMPILER_OPTIONS ||= JSON.stringify({ module: 'CommonJS', moduleResolution: 'Node' });
require('ts-node/register/transpile-only');

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { RandomService } = require('../src/shared/random.service');
const { loadDatabaseEnvironment, assertSafeDatabaseTarget } = require('./database-safety.cjs');

const root = path.resolve(__dirname, '../../..');
const reportPathArg = process.argv.indexOf('--report-file');
const reportPath = reportPathArg >= 0 ? path.resolve(root, process.argv[reportPathArg + 1] || '') : null;
const apply = process.argv.includes('--apply');
const format = /^mitra[a-z0-9]{4}\d{4}$/;

function assertLocalDevelopmentDatabase() {
  loadDatabaseEnvironment('development');
  assertSafeDatabaseTarget();
  const host = new URL(process.env.DATABASE_URL).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Refusing affiliate-code migration: only a loopback development database is allowed.');
  }
}

function uniqueCode(random, user, used) {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const code = random.generateReferralCode(user.name, user.id);
    if (!used.has(code.toLowerCase())) return code;
  }
  throw new Error(`Could not find a unique referral code for user ${user.id}.`);
}

async function createDryRun(prisma) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, referralCode: true },
    orderBy: { createdAt: 'asc' },
  });
  const aliases = await prisma.referral.findMany({ select: { code: true, userId: true } });
  const used = new Set([
    ...users.map((user) => user.referralCode.toLowerCase()),
    ...aliases.map((alias) => alias.code.toLowerCase()),
  ]);
  const seenCodes = new Set();
  for (const user of users) {
    const normalized = user.referralCode.toLowerCase();
    if (seenCodes.has(normalized)) throw new Error(`Duplicate user referral code requires manual review: ${user.referralCode}`);
    seenCodes.add(normalized);
  }

  const random = new RandomService();
  const targets = [];
  for (const user of users) {
    if (format.test(user.referralCode)) continue;
    const existingAlias = aliases.find((alias) => alias.code.toLowerCase() === user.referralCode.toLowerCase());
    if (existingAlias && existingAlias.userId !== user.id) {
      throw new Error(`Legacy code ${user.referralCode} is already assigned to another user.`);
    }
    const newCode = uniqueCode(random, user, used);
    used.add(newCode.toLowerCase());
    targets.push({
      userId: user.id,
      name: user.name,
      role: user.role,
      oldCode: user.referralCode,
      newCode,
      orderCodeUses: await prisma.order.count({ where: { referralCode: user.referralCode } }),
      historicalRedemptions: await prisma.referralRedemption.count({ where: { referralCode: user.referralCode } }),
      existingAlias: !!existingAlias,
    });
  }
  return { createdAt: new Date().toISOString(), targets };
}

async function applyReport(prisma, report) {
  if (!Array.isArray(report.targets)) throw new Error('Migration report is malformed.');
  const newCodes = new Set();
  for (const target of report.targets) {
    if (!format.test(target.newCode) || newCodes.has(target.newCode.toLowerCase())) {
      throw new Error('Migration report contains an invalid or duplicate proposed code.');
    }
    newCodes.add(target.newCode.toLowerCase());
  }

  await prisma.$transaction(async (transaction) => {
    for (const target of report.targets) {
      const user = await transaction.user.findUnique({
        where: { id: target.userId },
        select: { id: true, referralCode: true },
      });
      if (!user) throw new Error(`User ${target.userId} disappeared after the dry run.`);
      if (user.referralCode === target.newCode) continue;
      if (user.referralCode !== target.oldCode) {
        throw new Error(`User ${target.userId} changed after the dry run; regenerate the report.`);
      }

      const existingAlias = await transaction.referral.findFirst({
        where: { code: { equals: target.oldCode, mode: 'insensitive' } },
        select: { id: true, userId: true, status: true },
      });
      if (existingAlias && existingAlias.userId !== target.userId) {
        throw new Error(`Legacy code ${target.oldCode} now belongs to another user.`);
      }
      if (existingAlias) {
        if (existingAlias.status !== 'ACTIVE') {
          await transaction.referral.update({ where: { id: existingAlias.id }, data: { status: 'ACTIVE' } });
        }
      } else {
        await transaction.referral.create({
          data: { userId: target.userId, code: target.oldCode, status: 'ACTIVE' },
        });
      }
      await transaction.user.update({ where: { id: target.userId }, data: { referralCode: target.newCode } });
    }
  }, { isolationLevel: 'Serializable' });
}

async function main() {
  if (reportPath && !reportPath.startsWith(path.resolve(root, 'scratch') + path.sep)) {
    throw new Error('The migration report must be stored under the repository scratch directory.');
  }
  assertLocalDevelopmentDatabase();
  const prisma = new PrismaClient();
  try {
    if (!apply) {
      const report = await createDryRun(prisma);
      if (reportPath) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      }
      console.table(report.targets.map(({ name, role, oldCode, newCode, orderCodeUses, historicalRedemptions }) => ({
        account: name || '(unnamed)', role, oldCode, newCode, orderCodeUses, historicalRedemptions,
      })));
      console.log(`Dry run only: ${report.targets.length} account(s) proposed. No database rows changed.`);
      if (reportPath) console.log(`Report: ${path.relative(root, reportPath)}`);
      return;
    }

    if (!reportPath || !fs.existsSync(reportPath)) {
      throw new Error('Apply requires --report-file pointing to a previously generated dry-run report.');
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    await applyReport(prisma, report);
    console.log(`Applied ${report.targets.length} affiliate code update(s) with legacy aliases in one transaction.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
