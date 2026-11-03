ALTER TABLE "RentalPrice"
ADD COLUMN "securityDeposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "deliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "estimateLabel" TEXT,
ADD COLUMN "changeReason" TEXT;

CREATE TABLE "RentalPriceAudit" (
    "id" TEXT NOT NULL,
    "rentalPriceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousMonthlyPrice" DECIMAL(10,2),
    "newMonthlyPrice" DECIMAL(10,2) NOT NULL,
    "previousDeposit" DECIMAL(10,2),
    "newDeposit" DECIMAL(10,2) NOT NULL,
    "previousDeliveryCharge" DECIMAL(10,2),
    "newDeliveryCharge" DECIMAL(10,2) NOT NULL,
    "adminId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalPriceAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalPriceAudit_rentalPriceId_createdAt_idx"
ON "RentalPriceAudit"("rentalPriceId", "createdAt");

CREATE INDEX "RentalPriceAudit_adminId_createdAt_idx"
ON "RentalPriceAudit"("adminId", "createdAt");

ALTER TABLE "RentalPriceAudit"
ADD CONSTRAINT "RentalPriceAudit_rentalPriceId_fkey"
FOREIGN KEY ("rentalPriceId") REFERENCES "RentalPrice"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RentalPriceAudit"
ADD CONSTRAINT "RentalPriceAudit_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
