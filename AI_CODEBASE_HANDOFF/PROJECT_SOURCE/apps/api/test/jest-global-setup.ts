import { assertSafeDatabaseTarget, loadDatabaseEnvironment } from '../src/common/database-safety';

export default async function globalSetup() {
  loadDatabaseEnvironment('test');
  assertSafeDatabaseTarget();
  console.log('\n[Database Safety Guard] Verified test database target.');
}
