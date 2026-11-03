-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "buyback_request_seq" START WITH 1001;

-- CreateTable BuybackTier
CREATE TABLE "BuybackTier" (
  "id" TEXT NOT NULL,
  "fromMonths" INTEGER NOT NULL,
  "toMonths" INTEGER NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BuybackTier_pkey" PRIMARY KEY ("id")
);

-- CheckConstraints for BuybackTier
ALTER TABLE "BuybackTier" ADD CONSTRAINT "BuybackTier_months_order_check" CHECK ("fromMonths" < "toMonths");
ALTER TABLE "BuybackTier" ADD CONSTRAINT "BuybackTier_percentage_check" CHECK ("percentage" >= 0 AND "percentage" <= 100);

-- CreateIndexes for BuybackTier
CREATE UNIQUE INDEX "BuybackTier_fromMonths_toMonths_effectiveDate_key" ON "BuybackTier"("fromMonths", "toMonths", "effectiveDate");
CREATE INDEX "BuybackTier_isActive_fromMonths_idx" ON "BuybackTier"("isActive", "fromMonths");

-- CreateTable BuybackSettings
CREATE TABLE "BuybackSettings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "quoteValidityDays" INTEGER NOT NULL DEFAULT 15,
  "convenienceCharge" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "batteryMinPercent" INTEGER NOT NULL DEFAULT 70,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BuybackSettings_pkey" PRIMARY KEY ("id")
);

-- CheckConstraints for BuybackSettings
ALTER TABLE "BuybackSettings" ADD CONSTRAINT "BuybackSettings_quoteValidityDays_check" CHECK ("quoteValidityDays" > 0);
ALTER TABLE "BuybackSettings" ADD CONSTRAINT "BuybackSettings_convenienceCharge_check" CHECK ("convenienceCharge" >= 0);
ALTER TABLE "BuybackSettings" ADD CONSTRAINT "BuybackSettings_batteryMinPercent_check" CHECK ("batteryMinPercent" BETWEEN 0 AND 100);

-- CreateTable BuybackRequest
CREATE TABLE "BuybackRequest" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "unitNumber" INTEGER NOT NULL DEFAULT 1,
  "userId" TEXT NOT NULL,
  "ticketId" TEXT,
  "tierId" TEXT NOT NULL,

  "originalNetPrice" DECIMAL(10,2) NOT NULL,
  "deviceAgeMonths" INTEGER NOT NULL,
  "tierPercentApplied" DECIMAL(5,2) NOT NULL,
  "convenienceCharge" DECIMAL(10,2) NOT NULL,
  "initialQuotedAmount" DECIMAL(10,2) NOT NULL,
  "revisedQuotedAmount" DECIMAL(10,2),
  "finalPayoutAmount" DECIMAL(10,2),

  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "quoteVersion" INTEGER NOT NULL DEFAULT 1,
  "quoteIssuedAt" TIMESTAMP(3),
  "quoteExpiresAt" TIMESTAMP(3),
  "quoteAcceptedAt" TIMESTAMP(3),
  "customerAcceptedAt" TIMESTAMP(3),

  "bootsToOs" BOOLEAN,
  "motherboardWorking" BOOLEAN,
  "displayIntact" BOOLEAN,
  "originalCharger" BOOLEAN,
  "batteryHealthPercent" INTEGER,
  "inspectionNotes" TEXT,
  "inspectedBy" TEXT,
  "inspectedAt" TIMESTAMP(3),

  "payoutKeyId" TEXT,
  "payoutEncryptedData" TEXT,
  "payoutMaskedAccount" TEXT,
  "payoutMaskedIfsc" TEXT,
  "payoutMaskedUpi" TEXT,
  "payoutDetailsUpdatedAt" TIMESTAMP(3),
  "payoutUtr" TEXT,
  "payoutProcessedAt" TIMESTAMP(3),

  "returnCourierName" TEXT,
  "returnTrackingNumber" TEXT,
  "returnDispatchedAt" TIMESTAMP(3),
  "returnDeliveredAt" TIMESTAMP(3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BuybackRequest_pkey" PRIMARY KEY ("id")
);

-- CheckConstraints for BuybackRequest
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_status_check" CHECK ("status" IN (
  'REQUESTED', 'QUOTE_ISSUED', 'QUOTE_ACCEPTED', 'QUOTE_DECLINED', 'QUOTE_EXPIRED',
  'PICKUP_SCHEDULED', 'PICKED_UP', 'INSPECTING', 'INSPECTION_PASSED',
  'REVISED_OFFER_PENDING', 'REVISED_OFFER_ACCEPTED', 'REVISED_OFFER_DECLINED',
  'RETURNING_TO_CUSTOMER', 'RETURNED_TO_CUSTOMER',
  'PAYOUT_PENDING', 'PAID', 'REJECTED', 'CANCELLED'
));
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_unitNumber_check" CHECK ("unitNumber" >= 1);
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_originalNetPrice_check" CHECK ("originalNetPrice" >= 0);
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_tierPercent_check" CHECK ("tierPercentApplied" >= 0 AND "tierPercentApplied" <= 100);
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_convenienceCharge_check" CHECK ("convenienceCharge" >= 0);
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_initialQuotedAmount_check" CHECK ("initialQuotedAmount" >= 0);
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_revisedQuotedAmount_check" CHECK ("revisedQuotedAmount" IS NULL OR "revisedQuotedAmount" >= 0);
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_finalPayoutAmount_check" CHECK ("finalPayoutAmount" IS NULL OR "finalPayoutAmount" >= 0);

-- CreateIndexes for BuybackRequest
CREATE UNIQUE INDEX "BuybackRequest_requestNumber_key" ON "BuybackRequest"("requestNumber");
CREATE UNIQUE INDEX "BuybackRequest_ticketId_key" ON "BuybackRequest"("ticketId");
CREATE INDEX "BuybackRequest_userId_status_idx" ON "BuybackRequest"("userId", "status");
CREATE INDEX "BuybackRequest_status_createdAt_idx" ON "BuybackRequest"("status", "createdAt");

-- Partial Unique Index on Active (Non-Terminal) Units
CREATE UNIQUE INDEX "BuybackRequest_active_unit_idx" ON "BuybackRequest"("orderItemId", "unitNumber")
  WHERE "status" IN (
    'REQUESTED', 'QUOTE_ISSUED', 'QUOTE_ACCEPTED', 'PICKUP_SCHEDULED', 'PICKED_UP',
    'INSPECTING', 'INSPECTION_PASSED', 'REVISED_OFFER_PENDING', 'REVISED_OFFER_ACCEPTED', 'PAYOUT_PENDING'
  );

-- AddForeignKeys for BuybackRequest
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BuybackRequest" ADD CONSTRAINT "BuybackRequest_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "BuybackTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable BuybackEvent
CREATE TABLE "BuybackEvent" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BuybackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex and ForeignKey for BuybackEvent
CREATE INDEX "BuybackEvent_requestId_createdAt_idx" ON "BuybackEvent"("requestId", "createdAt");
ALTER TABLE "BuybackEvent" ADD CONSTRAINT "BuybackEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BuybackRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only trigger for BuybackEvent
CREATE OR REPLACE FUNCTION reject_buybackevent_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'BuybackEvent is append-only: updates and deletes are forbidden';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_buybackevent_immutable ON "BuybackEvent";
CREATE TRIGGER trg_buybackevent_immutable
  BEFORE UPDATE OR DELETE ON "BuybackEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_buybackevent_mutation();

-- Alter TicketAttachment to support BuybackRequest parent
ALTER TABLE "TicketAttachment" ADD COLUMN "buybackRequestId" TEXT;
CREATE INDEX "TicketAttachment_buybackRequestId_idx" ON "TicketAttachment"("buybackRequestId");
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_buybackRequestId_fkey" FOREIGN KEY ("buybackRequestId") REFERENCES "BuybackRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the 6 PHP Tiers
INSERT INTO "BuybackTier" ("id", "fromMonths", "toMonths", "percentage", "effectiveDate", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 0, 6, 70.00, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 6, 12, 60.00, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 12, 18, 50.00, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 18, 24, 40.00, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 24, 30, 30.00, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 30, 36, 20.00, CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Seed BuybackSettings Singleton
INSERT INTO "BuybackSettings" ("id", "quoteValidityDays", "convenienceCharge", "batteryMinPercent", "updatedAt")
VALUES ('singleton', 15, 0.00, 70, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

