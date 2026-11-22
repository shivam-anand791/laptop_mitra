-- Reconcile unmigrated schema.prisma additions (CartItem allocation fields, DiscountCode/DiscountRedemption coupon engine fields, OtpChallenge)
-- Expand-only, backward-compatible DDL: all added columns are nullable or have safe defaults.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: CartItem
ALTER TABLE "CartItem"
ADD COLUMN IF NOT EXISTS "allocatedDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "netPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable: DiscountCode
ALTER TABLE "DiscountCode"
ADD COLUMN IF NOT EXISTS "allowRentLease" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "allowedPaymentMethods" TEXT NOT NULL DEFAULT 'ANY',
ADD COLUMN IF NOT EXISTS "badgeText" TEXT,
ADD COLUMN IF NOT EXISTS "canCombineWithReferral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "dailyLimit" INTEGER,
ADD COLUMN IF NOT EXISTS "dailyUses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "excludeWarranty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "excludedCategoryIds" TEXT,
ADD COLUMN IF NOT EXISTS "excludedProductIds" TEXT,
ADD COLUMN IF NOT EXISTS "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "highlight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "internalNote" TEXT,
ADD COLUMN IF NOT EXISTS "lastDailyReset" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "maxDiscountCap" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "maxOrderValue" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "minQuantity" INTEGER,
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "targetPincodes" TEXT,
ADD COLUMN IF NOT EXISTS "targetedUserIds" TEXT,
ADD COLUMN IF NOT EXISTS "terms" TEXT,
ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
ALTER COLUMN "value" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "minOrderValue" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "maxUsesPerUser" SET DEFAULT 1,
ALTER COLUMN "appliesTo" SET DEFAULT 'all',
ALTER COLUMN "maxDiscountValue" SET DATA TYPE DECIMAL(10,2);

-- AlterTable: DiscountRedemption
ALTER TABLE "DiscountRedemption"
ADD COLUMN IF NOT EXISTS "allocatedLines" JSONB,
ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "discountType" TEXT NOT NULL DEFAULT 'FLAT',
ADD COLUMN IF NOT EXISTS "discountValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "orderSubtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "restorationReason" TEXT,
ADD COLUMN IF NOT EXISTS "restoredAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'REDEEMED';

-- CreateTable: OtpChallenge
CREATE TABLE IF NOT EXISTS "OtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "grantTokenHash" TEXT,
    "grantExpiresAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OtpChallenge_email_purpose_isConsumed_expiresAt_idx" ON "OtpChallenge"("email", "purpose", "isConsumed", "expiresAt");
CREATE INDEX IF NOT EXISTS "OtpChallenge_userId_purpose_idx" ON "OtpChallenge"("userId", "purpose");
CREATE INDEX IF NOT EXISTS "OtpChallenge_grantTokenHash_idx" ON "OtpChallenge"("grantTokenHash");
CREATE INDEX IF NOT EXISTS "DiscountCode_status_visibility_idx" ON "DiscountCode"("status", "visibility");
CREATE INDEX IF NOT EXISTS "DiscountCode_validFrom_validUntil_idx" ON "DiscountCode"("validFrom", "validUntil");
CREATE INDEX IF NOT EXISTS "DiscountRedemption_status_idx" ON "DiscountRedemption"("status");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

