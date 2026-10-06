import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

export function extractHost(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    return 'unknown (DATABASE_URL not set)';
  }
  try {
    const url = new URL(databaseUrl);
    return url.host; // returns hostname + port, strictly excluding username and password
  } catch {
    const match = databaseUrl.match(/@([^/:?#]+(?::\d+)?)/);
    if (match) {
      return match[1];
    }
    return 'custom-connection-string';
  }
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

export async function main() {
  const args = process.argv.slice(2);
  const isProdFlag = args.includes('--i-know-this-is-prod');
  const emailArg = args.find((arg) => !arg.startsWith('--'));

  if (!emailArg) {
    console.error('Usage: ts-node scripts/promote-admin.ts <email> [--i-know-this-is-prod]');
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !isProdFlag) {
    console.error(
      'ERROR: NODE_ENV is set to "production". To promote an admin in production, you must pass the --i-know-this-is-prod flag.',
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const dbHost = extractHost(process.env.DATABASE_URL);

  console.log(`\n--- Admin Promotion Request ---`);
  console.log(`Target Email:          ${email}`);
  console.log(`Target Database Host:  ${dbHost}`);
  console.log(`Environment:           ${process.env.NODE_ENV || 'development'}`);
  console.log(`--------------------------------`);

  const confirmed = await askConfirmation(`Are you sure you want to promote ${email} to ADMIN? (y/N): `);
  if (!confirmed) {
    console.log('Action cancelled by user.');
    process.exit(0);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      console.error(`ERROR: User with email "${email}" not found in database.`);
      process.exit(1);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
      select: { id: true, email: true, role: true },
    });

    console.log(`SUCCESS: User "${updated.email}" (ID: ${updated.id}) role updated to "${updated.role}".`);
  } catch (error: any) {
    console.error('ERROR: Failed to update user role:', error?.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
