import { PrismaClient } from '@prisma/client';

async function main() {
  const emailArg = process.argv[2];
  const uidArg = process.argv[3];

  if (!emailArg || !uidArg) {
    console.error('Usage: npx ts-node apps/api/scripts/link-admin-uid.ts <email> <firebaseUid>');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const firebaseUid = uidArg.trim();

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      console.error(`User with email "${email}" not found in database.`);
      process.exit(1);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firebaseUid,
        emailVerified: user.emailVerified || new Date(),
        role: user.role || 'ADMIN',
      },
    });

    console.log(`Successfully linked user "${updated.email}" (ID: ${updated.id}, Role: ${updated.role}) to Firebase UID "${updated.firebaseUid}"`);
  } catch (error) {
    console.error('Error linking admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
