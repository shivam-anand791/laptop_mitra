-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "tenureMonths" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pricingSnapshot" JSONB,
ADD COLUMN     "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "tenureMonths" INTEGER;

-- CreateTable
CREATE TABLE "RentalPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "tenureMonths" INTEGER NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "sellingPriceSnapshot" DECIMAL(10,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalSubscription" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "monthlyAmount" DECIMAL(10,2) NOT NULL,
    "totalCommitment" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "pricingSnapshot" JSONB NOT NULL,
    "razorpayPlanId" TEXT,
    "razorpaySubscriptionId" TEXT,
    "firstPaymentId" TEXT,
    "mandateStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'PENDING_AUTHORIZATION',
    "nextChargeAt" TIMESTAMP(3),
    "terminationRequestedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalPayment" (
    "id" TEXT NOT NULL,
    "rentalSubscriptionId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "pricingSnapshot" JSONB NOT NULL,
    "cycleNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalPrice_productId_variantId_tenureMonths_status_idx" ON "RentalPrice"("productId", "variantId", "tenureMonths", "status");

-- CreateIndex
CREATE INDEX "RentalPrice_status_createdAt_idx" ON "RentalPrice"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentalSubscription_orderId_key" ON "RentalSubscription"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalSubscription_razorpaySubscriptionId_key" ON "RentalSubscription"("razorpaySubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalSubscription_firstPaymentId_key" ON "RentalSubscription"("firstPaymentId");

-- CreateIndex
CREATE INDEX "RentalSubscription_userId_status_idx" ON "RentalSubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "RentalSubscription_status_terminationRequestedAt_idx" ON "RentalSubscription"("status", "terminationRequestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentalPayment_razorpayPaymentId_key" ON "RentalPayment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "RentalPayment_rentalSubscriptionId_createdAt_idx" ON "RentalPayment"("rentalSubscriptionId", "createdAt");

-- AddForeignKey
ALTER TABLE "RentalPrice" ADD CONSTRAINT "RentalPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalPrice" ADD CONSTRAINT "RentalPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalSubscription" ADD CONSTRAINT "RentalSubscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalSubscription" ADD CONSTRAINT "RentalSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalPayment" ADD CONSTRAINT "RentalPayment_rentalSubscriptionId_fkey" FOREIGN KEY ("rentalSubscriptionId") REFERENCES "RentalSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

