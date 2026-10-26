-- P0 checkout integrity: inventory reservations, payment uniqueness,
-- discount caps and persisted redemption attribution.

ALTER TABLE "Order"
  ADD COLUMN "inventoryStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);

ALTER TABLE "Payment"
  ADD COLUMN "refundId" TEXT,
  ADD COLUMN "refundStatus" TEXT;

ALTER TABLE "DiscountCode"
  ADD COLUMN "maxDiscountValue" DECIMAL(65,30);

CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");
CREATE INDEX "Order_inventoryStatus_reservationExpiresAt_idx"
  ON "Order"("inventoryStatus", "reservationExpiresAt");
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");
CREATE UNIQUE INDEX "Payment_refundId_key" ON "Payment"("refundId");

CREATE TABLE "DiscountRedemption" (
  "id" TEXT NOT NULL,
  "discountCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscountRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralRedemption" (
  "id" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "discountAmount" DECIMAL(65,30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscountRedemption_orderId_key" ON "DiscountRedemption"("orderId");
CREATE INDEX "DiscountRedemption_discountCodeId_userId_idx"
  ON "DiscountRedemption"("discountCodeId", "userId");
CREATE UNIQUE INDEX "ReferralRedemption_referredUserId_key"
  ON "ReferralRedemption"("referredUserId");
CREATE UNIQUE INDEX "ReferralRedemption_orderId_key" ON "ReferralRedemption"("orderId");
CREATE INDEX "ReferralRedemption_referrerUserId_idx"
  ON "ReferralRedemption"("referrerUserId");

ALTER TABLE "DiscountRedemption"
  ADD CONSTRAINT "DiscountRedemption_discountCodeId_fkey"
  FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiscountRedemption"
  ADD CONSTRAINT "DiscountRedemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiscountRedemption"
  ADD CONSTRAINT "DiscountRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralRedemption"
  ADD CONSTRAINT "ReferralRedemption_referrerUserId_fkey"
  FOREIGN KEY ("referrerUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralRedemption"
  ADD CONSTRAINT "ReferralRedemption_referredUserId_fkey"
  FOREIGN KEY ("referredUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralRedemption"
  ADD CONSTRAINT "ReferralRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
