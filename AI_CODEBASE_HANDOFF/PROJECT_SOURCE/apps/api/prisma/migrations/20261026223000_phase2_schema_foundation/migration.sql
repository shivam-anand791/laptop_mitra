-- DropIndex
DROP INDEX IF EXISTS "CartItem_cartId_productId_key";

-- AlterTable: CartItem
ALTER TABLE "CartItem" ADD COLUMN     "configuration" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "hasWarranty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchaseMode" TEXT NOT NULL DEFAULT 'sell',
ADD COLUMN     "warrantyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_configuration_check" CHECK ("configuration" IN ('default', 'ram-16gb'));

-- AlterTable: OrderItem
ALTER TABLE "OrderItem" ADD COLUMN     "configuration" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "hasWarranty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchaseMode" TEXT NOT NULL DEFAULT 'sell',
ADD COLUMN     "warrantyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_configuration_check" CHECK ("configuration" IN ('default', 'ram-16gb'));

-- AlterTable: Product
ALTER TABLE "Product" ADD COLUMN     "bulkLeasePrice" DECIMAL(10,2),
ADD COLUMN     "bulkSellPrice" DECIMAL(10,2),
ADD COLUMN     "leasePriceMonthly" DECIMAL(10,2);

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN     "referralReserved" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "referralWithdrawn" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "User"
  ADD CONSTRAINT "User_referralReserved_check" CHECK ("referralReserved" >= 0),
  ADD CONSTRAINT "User_referralWithdrawn_check" CHECK ("referralWithdrawn" >= 0),
  ADD CONSTRAINT "User_referral_balance_check" CHECK ("referralEarnings" - "referralReserved" - "referralWithdrawn" >= 0);

-- CreateTable: CorporateInquiry
CREATE TABLE "CorporateInquiry" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "laptopModel" TEXT,
    "productId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'sell',
    "quantity" INTEGER NOT NULL DEFAULT 5,
    "city" TEXT NOT NULL,
    "expectedTenure" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AffiliatePaymentDetails
CREATE TABLE "AffiliatePaymentDetails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT,
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "accountNumberMasked" TEXT,
    "ifscCode" TEXT,
    "upiId" TEXT,
    "upiIdMasked" TEXT,
    "qrCodeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliatePaymentDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WithdrawalRequest
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethodSnapshot" TEXT NOT NULL,
    "adminNotes" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WithdrawalRequest_amount_check" CHECK ("amount" > 0)
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateInquiry_status_idx" ON "CorporateInquiry"("status");
CREATE INDEX "CorporateInquiry_createdAt_idx" ON "CorporateInquiry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliatePaymentDetails_userId_key" ON "AffiliatePaymentDetails"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");
CREATE INDEX "WithdrawalRequest_createdAt_idx" ON "WithdrawalRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_purchaseMode_configuration_key" ON "CartItem"("cartId", "productId", "purchaseMode", "configuration");

-- AddForeignKey
ALTER TABLE "AffiliatePaymentDetails" ADD CONSTRAINT "AffiliatePaymentDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
