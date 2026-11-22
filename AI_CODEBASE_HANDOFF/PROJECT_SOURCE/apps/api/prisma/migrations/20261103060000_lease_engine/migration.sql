-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "lease_contract_seq" START WITH 1001;

-- CreateTable LeaseContract
CREATE TABLE IF NOT EXISTS "LeaseContract" (
  "id" TEXT NOT NULL,
  "contractNumber" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "tenureMonths" INTEGER NOT NULL,
  "monthlyAmount" DECIMAL(10,2) NOT NULL,
  "totalCommitment" DECIMAL(10,2) NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "rentalSubscriptionId" TEXT,
  "buyoutQuoteAmount" DECIMAL(10,2),
  "buyoutQuoteExpiresAt" TIMESTAMP(3),
  "buyoutStatus" TEXT DEFAULT 'NONE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeaseContract_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint on LeaseContract tenureMonths and status
ALTER TABLE "LeaseContract" DROP CONSTRAINT IF EXISTS "LeaseContract_tenureMonths_check";
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_tenureMonths_check"
  CHECK ("tenureMonths" IN (6, 12, 24));

ALTER TABLE "LeaseContract" DROP CONSTRAINT IF EXISTS "LeaseContract_status_check";
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_status_check"
  CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'TERMINATED', 'DEFAULTED', 'BOUGHT_OUT'));

-- Indexes and Unique Keys for LeaseContract
CREATE UNIQUE INDEX IF NOT EXISTS "LeaseContract_contractNumber_key" ON "LeaseContract"("contractNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "LeaseContract_orderItemId_key" ON "LeaseContract"("orderItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "LeaseContract_rentalSubscriptionId_key" ON "LeaseContract"("rentalSubscriptionId");
CREATE INDEX IF NOT EXISTS "LeaseContract_orderId_idx" ON "LeaseContract"("orderId");
CREATE INDEX IF NOT EXISTS "LeaseContract_userId_idx" ON "LeaseContract"("userId");
CREATE INDEX IF NOT EXISTS "LeaseContract_status_idx" ON "LeaseContract"("status");
CREATE INDEX IF NOT EXISTS "LeaseContract_createdAt_idx" ON "LeaseContract"("createdAt");

-- AddForeignKeys for LeaseContract
ALTER TABLE "LeaseContract" DROP CONSTRAINT IF EXISTS "LeaseContract_orderId_fkey";
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeaseContract" DROP CONSTRAINT IF EXISTS "LeaseContract_orderItemId_fkey";
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeaseContract" DROP CONSTRAINT IF EXISTS "LeaseContract_userId_fkey";
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeaseContract" DROP CONSTRAINT IF EXISTS "LeaseContract_productId_fkey";
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeaseContract" DROP CONSTRAINT IF EXISTS "LeaseContract_rentalSubscriptionId_fkey";
ALTER TABLE "LeaseContract" ADD CONSTRAINT "LeaseContract_rentalSubscriptionId_fkey"
  FOREIGN KEY ("rentalSubscriptionId") REFERENCES "RentalSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable LeaseInstallment
CREATE TABLE IF NOT EXISTS "LeaseInstallment" (
  "id" TEXT NOT NULL,
  "leaseContractId" TEXT NOT NULL,
  "installmentNumber" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "paymentId" TEXT,
  "gatewayPaymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeaseInstallment_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint on LeaseInstallment status
ALTER TABLE "LeaseInstallment" DROP CONSTRAINT IF EXISTS "LeaseInstallment_status_check";
ALTER TABLE "LeaseInstallment" ADD CONSTRAINT "LeaseInstallment_status_check"
  CHECK ("status" IN ('PENDING', 'PAID', 'OVERDUE', 'WAIVED'));

CREATE UNIQUE INDEX IF NOT EXISTS "LeaseInstallment_leaseContractId_installmentNumber_key"
  ON "LeaseInstallment"("leaseContractId", "installmentNumber");
CREATE INDEX IF NOT EXISTS "LeaseInstallment_leaseContractId_status_idx"
  ON "LeaseInstallment"("leaseContractId", "status");
CREATE INDEX IF NOT EXISTS "LeaseInstallment_dueDate_idx"
  ON "LeaseInstallment"("dueDate");

ALTER TABLE "LeaseInstallment" DROP CONSTRAINT IF EXISTS "LeaseInstallment_leaseContractId_fkey";
ALTER TABLE "LeaseInstallment" ADD CONSTRAINT "LeaseInstallment_leaseContractId_fkey"
  FOREIGN KEY ("leaseContractId") REFERENCES "LeaseContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable LeaseEvent
CREATE TABLE IF NOT EXISTS "LeaseEvent" (
  "id" TEXT NOT NULL,
  "leaseContractId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeaseEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LeaseEvent" DROP CONSTRAINT IF EXISTS "LeaseEvent_leaseContractId_fkey";
ALTER TABLE "LeaseEvent" ADD CONSTRAINT "LeaseEvent_leaseContractId_fkey"
  FOREIGN KEY ("leaseContractId") REFERENCES "LeaseContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "LeaseEvent_leaseContractId_createdAt_idx"
  ON "LeaseEvent"("leaseContractId", "createdAt");

-- Immutable trigger for LeaseEvent
CREATE OR REPLACE FUNCTION reject_lease_event_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'LeaseEvent is an immutable append-only audit ledger';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lease_event_immutable ON "LeaseEvent";
CREATE TRIGGER trg_lease_event_immutable
  BEFORE UPDATE OR DELETE ON "LeaseEvent"
  FOR EACH ROW
  EXECUTE FUNCTION reject_lease_event_modifications();

