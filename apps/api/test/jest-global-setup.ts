import * as dotenv from 'dotenv';
import { resolve } from 'path';

export default async function globalSetup() {
  // Prefer .env.test, fallback to .env.local, then .env
  dotenv.config({ path: resolve(__dirname, '../.env.test') });
  dotenv.config({ path: resolve(__dirname, '../.env.local') });
  dotenv.config({ path: resolve(__dirname, '../.env') });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE SAFETY ERROR: DATABASE_URL is not set.');
  }

  try {
    const parsed = new URL(dbUrl);
    const host = parsed.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      throw new Error(
        `FATAL DATABASE SAFETY ERROR: DATABASE_URL points to remote host "${host}". ` +
        `Tests and scripts are strictly forbidden from running against remote databases! ` +
        `Ensure DATABASE_URL host is localhost or 127.0.0.1.`
      );
    }
    console.log(`\n[Database Safety Guard] Verified local target: ${host} (Database: ${parsed.pathname.replace('/', '')})`);
  } catch (err: any) {
    if (err.message.includes('FATAL DATABASE SAFETY ERROR')) {
      throw err;
    }
    throw new Error(`DATABASE SAFETY ERROR: Invalid DATABASE_URL: ${err.message}`);
  }
}
