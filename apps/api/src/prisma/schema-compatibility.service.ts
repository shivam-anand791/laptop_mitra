import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from './prisma.service';

export type SchemaFeature = 'cart' | 'coupons' | 'otp';

export interface SchemaCompatibilityStatus {
  status: 'up-to-date' | 'MIGRATIONS_PENDING' | 'unknown';
  pendingMigrations: string[];
  missingFeatures: SchemaFeature[];
  checkedAt: string | null;
}

const FEATURE_REQUIREMENTS: Record<SchemaFeature, Array<{ table: string; column: string }>> = {
  cart: [
    { table: 'CartItem', column: 'allocatedDiscount' },
    { table: 'CartItem', column: 'netPrice' },
  ],
  coupons: [
    { table: 'DiscountCode', column: 'allowRentLease' },
    { table: 'DiscountRedemption', column: 'status' },
  ],
  otp: [{ table: 'OtpChallenge', column: 'id' }],
};

@Injectable()
export class SchemaCompatibilityService implements OnModuleInit {
  private readonly logger = new Logger(SchemaCompatibilityService.name);
  private status: SchemaCompatibilityStatus = {
    status: 'unknown',
    pendingMigrations: [],
    missingFeatures: [],
    checkedAt: null,
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  getRepoMigrations(migrationsDir = this.resolveMigrationsDir()): string[] {
    if (!migrationsDir || !existsSync(migrationsDir)) {
      return [];
    }
    return readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  private resolveMigrationsDir(): string {
    const candidates = [
      resolve(__dirname, '../../prisma/migrations'),
      resolve(__dirname, '../../../prisma/migrations'),
      resolve(process.cwd(), 'prisma/migrations'),
      resolve(process.cwd(), 'apps/api/prisma/migrations'),
    ];
    return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
  }

  async refresh(): Promise<SchemaCompatibilityStatus> {
    if (typeof (this.prisma as any)?.$queryRawUnsafe !== 'function') {
      this.status = {
        status: 'up-to-date',
        pendingMigrations: [],
        missingFeatures: [],
        checkedAt: new Date().toISOString(),
      };
      return this.status;
    }

    try {
      const repoMigrations = this.getRepoMigrations();
      const appliedRows = await this.prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
        'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
      );
      const appliedSet = new Set(
        Array.isArray(appliedRows) ? appliedRows.map((row) => row.migration_name) : [],
      );
      const pendingMigrations = repoMigrations.filter((name) => !appliedSet.has(name));

      const requiredTables = Array.from(
        new Set(
          Object.values(FEATURE_REQUIREMENTS)
            .flat()
            .map((req) => req.table),
        ),
      );
      const placeholders = requiredTables.map((_, i) => `$${i + 1}`).join(', ');
      const colRows = await this.prisma.$queryRawUnsafe<
        Array<{ table_name: string; column_name: string }>
      >(
        `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (${placeholders})`,
        ...requiredTables,
      );
      const presentColumns = new Set(
        Array.isArray(colRows) ? colRows.map((r) => `${r.table_name}.${r.column_name}`) : [],
      );

      const missingFeatures: SchemaFeature[] = [];
      for (const [feature, reqs] of Object.entries(FEATURE_REQUIREMENTS) as Array<
        [SchemaFeature, Array<{ table: string; column: string }>]
      >) {
        if (reqs.some((req) => !presentColumns.has(`${req.table}.${req.column}`))) {
          missingFeatures.push(feature);
        }
      }

      const isPending = pendingMigrations.length > 0 || missingFeatures.length > 0;
      this.status = {
        status: isPending ? 'MIGRATIONS_PENDING' : 'up-to-date',
        pendingMigrations,
        missingFeatures,
        checkedAt: new Date().toISOString(),
      };

      if (isPending) {
        this.logger.warn(
          `[SchemaCompatibility] MIGRATIONS_PENDING: pendingMigrations=[${pendingMigrations.join(', ')}] missingFeatures=[${missingFeatures.join(', ')}]`,
        );
      }

      return this.status;
    } catch (error: any) {
      this.logger.warn(
        `[SchemaCompatibility] Unable to verify schema state: ${error?.message || error}`,
      );
      this.status = {
        status: 'unknown',
        pendingMigrations: [],
        missingFeatures: [],
        checkedAt: new Date().toISOString(),
      };
      return this.status;
    }
  }

  getStatus(): SchemaCompatibilityStatus {
    return this.status;
  }

  isFeatureReady(feature: SchemaFeature): boolean {
    return !this.status.missingFeatures.includes(feature);
  }

  assertFeatureReady(feature: SchemaFeature): void {
    if (!this.isFeatureReady(feature)) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        code: 'MIGRATIONS_PENDING',
        message: 'This feature is temporarily unavailable while a database update is pending.',
      });
    }
  }
}

