import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { MailService } from '../src/modules/mail/mail.service';

// Load .env files
dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  const targetEmail = process.argv[2];
  if (!targetEmail) {
    console.error('Error: Please provide a recipient email address.\nUsage: npx ts-node scripts/send-test-email.ts user@example.com');
    process.exit(1);
  }

  console.log(`\nInitializing LaptopMitra MailService...`);
  const mailService = new MailService();
  mailService.onModuleInit();

  console.log(`Active Transport Provider: ${mailService.getActiveProvider().toUpperCase()}`);
  console.log(`Default From Address:     ${mailService.getDefaultFrom()}`);
  console.log(`Target Recipient:         ${targetEmail}\n`);

  console.log('Sending test email...');
  const result = await mailService.sendTestEmail(targetEmail);

  console.log('\n--- Result ---');
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log(`\n✅ Test email successfully dispatched via ${result.provider.toUpperCase()}!`);
  } else {
    console.error(`\n❌ Failed to dispatch test email: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
