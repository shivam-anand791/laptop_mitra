CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "price" DECIMAL(10,2) NOT NULL,
    "compareAtPrice" DECIMAL(10,2),
    "leasePriceMonthly" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantImage" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVariantImage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CartItem"
    ADD COLUMN "variantId" TEXT,
    ADD COLUMN "lineKey" TEXT;

UPDATE "CartItem"
SET "lineKey" = "productId" || ':' || "purchaseMode" || ':' || "configuration";

ALTER TABLE "CartItem"
    ALTER COLUMN "lineKey" SET NOT NULL;

ALTER TABLE "OrderItem"
    ADD COLUMN "variantId" TEXT,
    ADD COLUMN "variantSku" TEXT,
    ADD COLUMN "variantName" TEXT,
    ADD COLUMN "variantAttributes" JSONB;

DROP INDEX IF EXISTS "CartItem_cartId_productId_purchaseMode_configuration_key";
CREATE UNIQUE INDEX "CartItem_cartId_lineKey_key" ON "CartItem"("cartId", "lineKey");
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");
CREATE INDEX "ProductVariant_productId_isDefault_idx" ON "ProductVariant"("productId", "isDefault");
CREATE INDEX "ProductVariant_stock_idx" ON "ProductVariant"("stock");
CREATE INDEX "ProductVariantImage_variantId_sortOrder_idx" ON "ProductVariantImage"("variantId", "sortOrder");
CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

ALTER TABLE "ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductVariantImage"
    ADD CONSTRAINT "ProductVariantImage_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem"
    ADD CONSTRAINT "CartItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
