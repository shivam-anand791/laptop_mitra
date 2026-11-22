-- CreateSequences
CREATE SEQUENCE IF NOT EXISTS "service_job_seq" START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS "service_receipt_seq" START WITH 1001;

-- CreateTable ServiceEntitlement
CREATE TABLE IF NOT EXISTS "ServiceEntitlement" (
  "id" TEXT NOT NULL,
  "soldUnitId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'OUTRIGHT_FREE',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "cycleMonth" INTEGER,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ServiceEntitlement_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint on ServiceEntitlement kind and status
ALTER TABLE "ServiceEntitlement" DROP CONSTRAINT IF EXISTS "ServiceEntitlement_kind_check";
ALTER TABLE "ServiceEntitlement" ADD CONSTRAINT "ServiceEntitlement_kind_check"
  CHECK ("kind" IN ('OUTRIGHT_FREE', 'LEASE_MONTHLY'));

ALTER TABLE "ServiceEntitlement" DROP CONSTRAINT IF EXISTS "ServiceEntitlement_status_check";
ALTER TABLE "ServiceEntitlement" ADD CONSTRAINT "ServiceEntitlement_status_check"
  CHECK ("status" IN ('AVAILABLE', 'BOOKED', 'USED', 'EXPIRED', 'CANCELLED'));

-- Indexes and Unique Keys for ServiceEntitlement
CREATE INDEX IF NOT EXISTS "ServiceEntitlement_soldUnitId_status_idx" ON "ServiceEntitlement"("soldUnitId", "status");
CREATE INDEX IF NOT EXISTS "ServiceEntitlement_userId_status_idx" ON "ServiceEntitlement"("userId", "status");
CREATE INDEX IF NOT EXISTS "ServiceEntitlement_periodEnd_status_idx" ON "ServiceEntitlement"("periodEnd", "status");

-- ForeignKeys for ServiceEntitlement
ALTER TABLE "ServiceEntitlement" DROP CONSTRAINT IF EXISTS "ServiceEntitlement_soldUnitId_fkey";
ALTER TABLE "ServiceEntitlement" ADD CONSTRAINT "ServiceEntitlement_soldUnitId_fkey"
  FOREIGN KEY ("soldUnitId") REFERENCES "SoldUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceEntitlement" DROP CONSTRAINT IF EXISTS "ServiceEntitlement_userId_fkey";
ALTER TABLE "ServiceEntitlement" ADD CONSTRAINT "ServiceEntitlement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable ServiceJob
CREATE TABLE IF NOT EXISTS "ServiceJob" (
  "id" TEXT NOT NULL,
  "jobNumber" TEXT NOT NULL,
  "soldUnitId" TEXT NOT NULL,
  "entitlementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "technicianId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "pickupAddress" JSONB NOT NULL,
  "pickupPincode" TEXT NOT NULL,
  "preferredSlot" TEXT NOT NULL,
  "scheduledPickupAt" TIMESTAMP(3),
  "actualPickedUpAt" TIMESTAMP(3),
  "scheduledDropAt" TIMESTAMP(3),
  "actualDeliveredAt" TIMESTAMP(3),
  "checklistCleaning" BOOLEAN NOT NULL DEFAULT false,
  "checklistThermalPaste" BOOLEAN NOT NULL DEFAULT false,
  "checklistSoftware" BOOLEAN NOT NULL DEFAULT false,
  "checklistBattery" BOOLEAN NOT NULL DEFAULT false,
  "batteryHealthPercent" INTEGER,
  "partsReplaced" TEXT,
  "internalNotes" TEXT,
  "customerNotes" TEXT,
  "internalPhotos" JSONB,
  "backupAcknowledged" BOOLEAN NOT NULL DEFAULT true,
  "receiptNumber" TEXT,
  "receiptPdfKey" TEXT,
  "cancellationReason" TEXT,
  "cancelledBy" TEXT,
  "rescheduledCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ServiceJob_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint on ServiceJob status
ALTER TABLE "ServiceJob" DROP CONSTRAINT IF EXISTS "ServiceJob_status_check";
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_status_check"
  CHECK ("status" IN ('REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'PICKED_UP', 'IN_SERVICE', 'QUALITY_CHECK', 'READY_FOR_DROP', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'));

-- Indexes and Unique Keys for ServiceJob
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceJob_jobNumber_key" ON "ServiceJob"("jobNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceJob_entitlementId_key" ON "ServiceJob"("entitlementId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceJob_receiptNumber_key" ON "ServiceJob"("receiptNumber");
CREATE INDEX IF NOT EXISTS "ServiceJob_status_createdAt_idx" ON "ServiceJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ServiceJob_technicianId_status_idx" ON "ServiceJob"("technicianId", "status");
CREATE INDEX IF NOT EXISTS "ServiceJob_userId_status_idx" ON "ServiceJob"("userId", "status");
CREATE INDEX IF NOT EXISTS "ServiceJob_soldUnitId_idx" ON "ServiceJob"("soldUnitId");

-- ForeignKeys for ServiceJob
ALTER TABLE "ServiceJob" DROP CONSTRAINT IF EXISTS "ServiceJob_soldUnitId_fkey";
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_soldUnitId_fkey"
  FOREIGN KEY ("soldUnitId") REFERENCES "SoldUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceJob" DROP CONSTRAINT IF EXISTS "ServiceJob_entitlementId_fkey";
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_entitlementId_fkey"
  FOREIGN KEY ("entitlementId") REFERENCES "ServiceEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceJob" DROP CONSTRAINT IF EXISTS "ServiceJob_userId_fkey";
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceJob" DROP CONSTRAINT IF EXISTS "ServiceJob_technicianId_fkey";
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable ServiceEvent
CREATE TABLE IF NOT EXISTS "ServiceEvent" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "oldStatus" TEXT,
  "newStatus" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes for ServiceEvent
CREATE INDEX IF NOT EXISTS "ServiceEvent_jobId_createdAt_idx" ON "ServiceEvent"("jobId", "createdAt");

-- ForeignKeys for ServiceEvent
ALTER TABLE "ServiceEvent" DROP CONSTRAINT IF EXISTS "ServiceEvent_jobId_fkey";
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceEvent" DROP CONSTRAINT IF EXISTS "ServiceEvent_actorId_fkey";
ALTER TABLE "ServiceEvent" ADD CONSTRAINT "ServiceEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only trigger for ServiceEvent
CREATE OR REPLACE FUNCTION prevent_service_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ServiceEvent records are strictly append-only and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_event_append_only ON "ServiceEvent";
CREATE TRIGGER trg_service_event_append_only
BEFORE UPDATE OR DELETE ON "ServiceEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_service_event_mutation();
