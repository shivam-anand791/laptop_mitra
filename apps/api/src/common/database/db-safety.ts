/**
 * Database Safety Guard
 *
 * Mandate: Never run migrations, tests, seeds, or scripts against a remote database.
 * Aborts immediately unless the host is strictly localhost or 127.0.0.1.
 */

export function assertLocalDatabase(databaseUrl?: string): { host: string; dbName: string } {
  const urlStr = databaseUrl || process.env.DATABASE_URL;
  if (!urlStr) {
    throw new Error('DATABASE SAFETY ERROR: DATABASE_URL is not set.');
  }

  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname;
    const dbName = parsed.pathname.replace(/^\//, '');

    if (host !== 'localhost' && host !== '127.0.0.1') {
      console.error('\n' + '='.repeat(80));
      console.error(`FATAL DATABASE SAFETY ERROR: Remote target detected!`);
      console.error(`Host: ${host}`);
      console.error(`Database: ${dbName}`);
      console.error(`Migrations, tests, seeds, and scripts are strictly restricted to localhost or 127.0.0.1.`);
      console.error('='.repeat(80) + '\n');
      process.exit(1);
    }

    return { host, dbName };
  } catch (err: any) {
    console.error(`DATABASE SAFETY ERROR: Invalid database URL: ${err.message}`);
    process.exit(1);
  }
}

// Self-invoking safety check when executed directly or imported
if (require.main === module) {
  const { host, dbName } = assertLocalDatabase();
  console.log(`✔ Verified local database: ${host} / ${dbName}`);
}
