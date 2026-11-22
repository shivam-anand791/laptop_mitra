import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import {
  assertRuntimeDatabaseTarget,
  assertSafeDatabaseTarget,
  loadDatabaseEnvironment,
} from '../src/common/database-safety';
import { assertAdminBootstrapCandidate } from '../src/auth/admin-bootstrap';
import { FirebaseService } from '../src/firebase/firebase.service';

async function main() {
  const deploymentEnvironment = process.env.DEPLOYMENT_ENV || 'development';
  if (deploymentEnvironment === 'development') {
    loadDatabaseEnvironment('development');
    dotenv.config({ path: resolve(__dirname, '../.env') });
    assertSafeDatabaseTarget();
  } else if (['preview', 'staging', 'production'].includes(deploymentEnvironment)) {
    if (!process.argv.includes(`--confirm-${deploymentEnvironment}`)) {
      throw new Error(`Pass --confirm-${deploymentEnvironment} to target this database.`);
    }
    assertRuntimeDatabaseTarget();
  } else {
    throw new Error('Admin bootstrap only supports development, preview, staging, or production.');
  }

  const firebaseUid = process.env.BOOTSTRAP_ADMIN_UID?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!firebaseUid || !email) {
    throw new Error(
      'Set BOOTSTRAP_ADMIN_UID and BOOTSTRAP_ADMIN_EMAIL in the selected environment.',
    );
  }

  const prisma = new PrismaClient();
  try {
    const firebaseService = new FirebaseService(new ConfigService(process.env));
    const firebaseUser = await firebaseService.getUserRecord(firebaseUid);
    const [candidate, emailMatches] = await Promise.all([
      prisma.user.findUnique({
        where: { firebaseUid },
        select: {
          id: true,
          firebaseUid: true,
          email: true,
          emailVerified: true,
          status: true,
          role: true,
        },
      }),
      prisma.user.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      }),
    ]);

    if (!firebaseUser.email || firebaseUser.email.trim().toLowerCase() !== email) {
      throw new Error('The Firebase email does not match the configured admin identity.');
    }
    assertAdminBootstrapCandidate(candidate, firebaseUid, email, emailMatches.length, firebaseUser.emailVerified);
    if (candidate.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: candidate.id }, data: { role: 'ADMIN' } });
      console.log(
        `Admin bootstrap complete for the configured identity in ${deploymentEnvironment}.`,
      );
    } else {
      console.log(`Configured identity is already ADMIN in ${deploymentEnvironment}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Admin bootstrap failed.');
  process.exitCode = 1;
});
