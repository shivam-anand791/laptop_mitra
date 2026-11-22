-- AlterTable OrderItem
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "refundAmount" DECIMAL(10,2);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "refundStatus" TEXT;

-- CheckConstraint on OrderItem status
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_status_check";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_status_check"
  CHECK ("status" IN ('ACTIVE', 'CANCELLED'));

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "originalSubtotal" DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "originalFinalAmount" DECIMAL(10,2);

-- CreateTable OrderItemCancellation
CREATE TABLE IF NOT EXISTS "OrderItemCancellation" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "cancelledBy" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "refundAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "refundStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
  "restockedQuantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderItemCancellation_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys with ON DELETE RESTRICT
ALTER TABLE "OrderItemCancellation" DROP CONSTRAINT IF EXISTS "OrderItemCancellation_orderItemId_fkey";
ALTER TABLE "OrderItemCancellation" ADD CONSTRAINT "OrderItemCancellation_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItemCancellation" DROP CONSTRAINT IF EXISTS "OrderItemCancellation_orderId_fkey";
ALTER TABLE "OrderItemCancellation" ADD CONSTRAINT "OrderItemCancellation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "OrderItemCancellation_orderItemId_idx" ON "OrderItemCancellation"("orderItemId");
CREATE INDEX IF NOT EXISTS "OrderItemCancellation_orderId_idx" ON "OrderItemCancellation"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItemCancellation_createdAt_idx" ON "OrderItemCancellation"("createdAt");

-- Immutable trigger for OrderItemCancellation
CREATE OR REPLACE FUNCTION reject_order_item_cancellation_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'OrderItemCancellation is an immutable append-only audit ledger';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_item_cancellation_immutable ON "OrderItemCancellation";
CREATE TRIGGER trg_order_item_cancellation_immutable
  BEFORE UPDATE OR DELETE ON "OrderItemCancellation"
  FOR EACH ROW
  EXECUTE FUNCTION reject_order_item_cancellation_modifications();

