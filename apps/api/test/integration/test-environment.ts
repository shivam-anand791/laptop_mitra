import { assertSafeDatabaseTarget, loadDatabaseEnvironment } from '../../src/common/database-safety';
import { assertIntegrationDatabase } from './database';

loadDatabaseEnvironment('test', 'laptopmitra_test');
assertSafeDatabaseTarget();
assertIntegrationDatabase();

process.env.PAYMENT_ENCRYPTION_KEY = '00'.repeat(32);
process.env.RAZORPAY_KEY_ID = 'test-only-key-id';
process.env.RAZORPAY_KEY_SECRET = 'test-only-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-only-webhook-secret';
process.env.STORAGE_DRIVER = 'local';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.MAIL_DRIVER = 'console';
