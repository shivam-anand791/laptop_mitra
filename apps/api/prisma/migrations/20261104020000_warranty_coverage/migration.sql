-- CreateTable WarrantyCoverage
CREATE TABLE IF NOT EXISTS "WarrantyCoverage" (
  "id" TEXT NOT NULL,
  "soldUnitId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'BASE',
  "monthsSnapshot" INTEGER NOT NULL DEFAULT 6,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WarrantyCoverage_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint on WarrantyCoverage source and status
ALTER TABLE "WarrantyCoverage" DROP CONSTRAINT IF EXISTS "WarrantyCoverage_source_check";
ALTER TABLE "WarrantyCoverage" ADD CONSTRAINT "WarrantyCoverage_source_check"
  CHECK ("source" IN ('BASE', 'EXTENDED'));

ALTER TABLE "WarrantyCoverage" DROP CONSTRAINT IF EXISTS "WarrantyCoverage_status_check";
ALTER TABLE "WarrantyCoverage" ADD CONSTRAINT "WarrantyCoverage_status_check"
  CHECK ("status" IN ('ACTIVE', 'EXPIRED', 'VOIDED'));

-- Indexes and Unique Keys for WarrantyCoverage
CREATE UNIQUE INDEX IF NOT EXISTS "WarrantyCoverage_soldUnitId_key" ON "WarrantyCoverage"("soldUnitId");
CREATE INDEX IF NOT EXISTS "WarrantyCoverage_endDate_status_idx" ON "WarrantyCoverage"("endDate", "status");

-- ForeignKeys for WarrantyCoverage
ALTER TABLE "WarrantyCoverage" DROP CONSTRAINT IF EXISTS "WarrantyCoverage_soldUnitId_fkey";
ALTER TABLE "WarrantyCoverage" ADD CONSTRAINT "WarrantyCoverage_soldUnitId_fkey"
  FOREIGN KEY ("soldUnitId") REFERENCES "SoldUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

