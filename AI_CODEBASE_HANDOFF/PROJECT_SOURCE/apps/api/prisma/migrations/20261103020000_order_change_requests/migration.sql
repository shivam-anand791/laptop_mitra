-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "order_change_request_seq" START WITH 1001;

-- CreateTable
CREATE TABLE "OrderChangeRequest" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "userId" TEXT NOT NULL,
  "ticketId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedData" JSONB NOT NULL,
  "previousData" JSONB NOT NULL,
  "adminNotes" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrderChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CheckConstraints
ALTER TABLE "OrderChangeRequest" ADD CONSTRAINT "OrderChangeRequest_type_check"
  CHECK ("type" IN ('ADDRESS_CHANGE', 'PHONE_CHANGE', 'LEASE_EXTENSION', 'LEASE_TERMINATION', 'LEASE_BUYOUT'));

ALTER TABLE "OrderChangeRequest" ADD CONSTRAINT "OrderChangeRequest_status_check"
  CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'APPLIED'));

-- CreateIndexes
CREATE UNIQUE INDEX "OrderChangeRequest_requestNumber_key" ON "OrderChangeRequest"("requestNumber");
CREATE INDEX "OrderChangeRequest_orderId_status_idx" ON "OrderChangeRequest"("orderId", "status");
CREATE INDEX "OrderChangeRequest_userId_status_idx" ON "OrderChangeRequest"("userId", "status");
CREATE INDEX "OrderChangeRequest_status_createdAt_idx" ON "OrderChangeRequest"("status", "createdAt");

-- AddForeignKeys
ALTER TABLE "OrderChangeRequest" ADD CONSTRAINT "OrderChangeRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderChangeRequest" ADD CONSTRAINT "OrderChangeRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderChangeRequest" ADD CONSTRAINT "OrderChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderChangeRequest" ADD CONSTRAINT "OrderChangeRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

