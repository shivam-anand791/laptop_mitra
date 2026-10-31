ALTER TABLE "ProductVariant"
    ADD CONSTRAINT "ProductVariant_attributes_object_check"
        CHECK (jsonb_typeof("attributes") = 'object'),
    ADD CONSTRAINT "ProductVariant_price_nonnegative_check"
        CHECK ("price" >= 0),
    ADD CONSTRAINT "ProductVariant_compareAtPrice_nonnegative_check"
        CHECK ("compareAtPrice" IS NULL OR "compareAtPrice" >= 0),
    ADD CONSTRAINT "ProductVariant_leasePriceMonthly_nonnegative_check"
        CHECK ("leasePriceMonthly" IS NULL OR "leasePriceMonthly" >= 0),
    ADD CONSTRAINT "ProductVariant_stock_nonnegative_check"
        CHECK ("stock" >= 0);

CREATE UNIQUE INDEX "ProductVariant_one_active_default_per_product_key"
    ON "ProductVariant"("productId")
    WHERE "isActive" = true AND "isDefault" = true;

CREATE UNIQUE INDEX "ProductVariant_active_combination_key"
    ON "ProductVariant"("productId", "attributes")
    WHERE "isActive" = true;

ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
