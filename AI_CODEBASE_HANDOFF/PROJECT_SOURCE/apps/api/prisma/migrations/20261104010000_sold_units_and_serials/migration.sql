-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "sold_unit_seq" START WITH 1001;

-- CreateTable SoldUnit
CREATE TABLE IF NOT EXISTS "SoldUnit" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "unitIndex" INTEGER NOT NULL DEFAULT 1,
  "serialNumber" TEXT,
  "brandSnapshot" TEXT NOT NULL,
  "modelSnapshot" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "isDispatched" BOOLEAN NOT NULL DEFAULT false,
  "dispatchedAt" TIMESTAMP(3),
  "dispatchedBy" TEXT,
  "overrideReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SoldUnit_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint on SoldUnit status
ALTER TABLE "SoldUnit" DROP CONSTRAINT IF EXISTS "SoldUnit_status_check";
ALTER TABLE "SoldUnit" ADD CONSTRAINT "SoldUnit_status_check"
  CHECK ("status" IN ('ACTIVE', 'RETURNED', 'REFUNDED', 'BOUGHT_BACK', 'REPLACED'));

-- Indexes and Unique Keys for SoldUnit
CREATE UNIQUE INDEX IF NOT EXISTS "SoldUnit_orderItemId_unitIndex_key" ON "SoldUnit"("orderItemId", "unitIndex");
CREATE INDEX IF NOT EXISTS "SoldUnit_serialNumber_idx" ON "SoldUnit"("serialNumber");
CREATE INDEX IF NOT EXISTS "SoldUnit_userId_status_idx" ON "SoldUnit"("userId", "status");
CREATE INDEX IF NOT EXISTS "SoldUnit_productId_idx" ON "SoldUnit"("productId");

-- ForeignKeys for SoldUnit
ALTER TABLE "SoldUnit" DROP CONSTRAINT IF EXISTS "SoldUnit_orderItemId_fkey";
ALTER TABLE "SoldUnit" ADD CONSTRAINT "SoldUnit_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SoldUnit" DROP CONSTRAINT IF EXISTS "SoldUnit_productId_fkey";
ALTER TABLE "SoldUnit" ADD CONSTRAINT "SoldUnit_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SoldUnit" DROP CONSTRAINT IF EXISTS "SoldUnit_userId_fkey";
ALTER TABLE "SoldUnit" ADD CONSTRAINT "SoldUnit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable SoldUnitSerialHistory
CREATE TABLE IF NOT EXISTS "SoldUnitSerialHistory" (
  "id" TEXT NOT NULL,
  "soldUnitId" TEXT NOT NULL,
  "previousSerial" TEXT,
  "newSerial" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SoldUnitSerialHistory_pkey" PRIMARY KEY ("id")
);

-- Indexes for SoldUnitSerialHistory
CREATE INDEX IF NOT EXISTS "SoldUnitSerialHistory_soldUnitId_createdAt_idx" ON "SoldUnitSerialHistory"("soldUnitId", "createdAt");

-- ForeignKeys for SoldUnitSerialHistory
ALTER TABLE "SoldUnitSerialHistory" DROP CONSTRAINT IF EXISTS "SoldUnitSerialHistory_soldUnitId_fkey";
ALTER TABLE "SoldUnitSerialHistory" ADD CONSTRAINT "SoldUnitSerialHistory_soldUnitId_fkey"
  FOREIGN KEY ("soldUnitId") REFERENCES "SoldUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SoldUnitSerialHistory" DROP CONSTRAINT IF EXISTS "SoldUnitSerialHistory_changedBy_fkey";
ALTER TABLE "SoldUnitSerialHistory" ADD CONSTRAINT "SoldUnitSerialHistory_changedBy_fkey"
  FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only trigger for SoldUnitSerialHistory
CREATE OR REPLACE FUNCTION prevent_serial_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'SoldUnitSerialHistory records are strictly append-only and immutable.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_serial_history_append_only ON "SoldUnitSerialHistory";
CREATE TRIGGER trg_serial_history_append_only
BEFORE UPDATE OR DELETE ON "SoldUnitSerialHistory"
FOR EACH ROW EXECUTE FUNCTION prevent_serial_history_mutation();

